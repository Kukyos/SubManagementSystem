"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, isDate, text, today } from "@/lib/forms";
import { getCurrentUser } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import type { FormState } from "@/services/catalogue-actions";
import type { BillingPeriod, PaymentTerms, SubscriptionStatus } from "@/types/models";

const terms: PaymentTerms[] = ["immediate", "net_7", "net_15", "net_30", "net_45", "net_60"];

async function staffOnly() {
  const user = await getCurrentUser();
  return user && (user.role === "admin" || user.role === "staff") ? user : null;
}

function refresh(id: string) {
  revalidatePath(`/subscriptions/${id}`);
  revalidatePath("/subscriptions");
}

// A line's unit price: the plan's price when it's the plan's own product,
// otherwise the product's list price, plus the variant's extra either way.
async function priceFor(plan: { product_id: string | null; price: number } | null, productId: string, variantId: string | null) {
  const supabase = await createClient();
  const [{ data: product }, { data: variant }] = await Promise.all([
    supabase.from("products").select("sales_price, is_active").eq("id", productId).maybeSingle(),
    variantId
      ? supabase.from("product_variants").select("extra_price, product_id").eq("id", variantId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!product) return null;
  if (variant && variant.product_id !== productId) return null;
  const base = plan?.product_id === productId ? Number(plan.price) : Number(product.sales_price);
  return Math.round((base + Number(variant?.extra_price ?? 0)) * 100) / 100;
}

async function unitPrice(subscriptionId: string, productId: string, variantId: string | null) {
  const supabase = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("plans(product_id, price)").eq("id", subscriptionId).single();
  return priceFor(sub?.plans ?? null, productId, variantId);
}

// Start date plus n billing cycles, for a template's contract length.
function addCycles(start: string, period: BillingPeriod, every: number, n: number) {
  const d = new Date(start + "T00:00:00Z");
  const steps = every * n;
  if (period === "daily") d.setUTCDate(d.getUTCDate() + steps);
  if (period === "weekly") d.setUTCDate(d.getUTCDate() + steps * 7);
  if (period === "monthly") d.setUTCMonth(d.getUTCMonth() + steps);
  if (period === "yearly") d.setUTCFullYear(d.getUTCFullYear() + steps);
  return d.toISOString().slice(0, 10);
}

export async function createSubscription(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["templateId", "customerId", "planId", "startDate", "expiryDate", "paymentTerms", "notes"].map((k) => [k, text(formData, k)]),
  );
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const user = await staffOnly();
  if (!user) return fail("Only staff can create subscriptions.");
  const supabase = await createClient();

  // A template fixes the plan and terms and brings its own lines.
  const template = uuid.test(values.templateId)
    ? (
        await supabase
          .from("quotation_templates")
          .select("id, plan_id, payment_terms, duration_periods, notes, quotation_template_lines(product_id, variant_id, description, quantity, unit_price, position)")
          .eq("id", values.templateId)
          .maybeSingle()
      ).data
    : null;
  if (values.templateId && !template) return fail("That template no longer exists.");
  if (template) {
    values.planId = template.plan_id;
    values.paymentTerms = template.payment_terms;
  }

  if (!uuid.test(values.customerId)) return fail("Pick a customer.");
  if (!uuid.test(values.planId)) return fail("Pick a plan.");
  if (!isDate(values.startDate)) return fail("Pick a start date.");
  if (values.expiryDate && (!isDate(values.expiryDate) || values.expiryDate < values.startDate))
    return fail("The end date has to be after the start date.");
  if (!terms.includes(values.paymentTerms as PaymentTerms)) return fail("Pick payment terms.");

  const { data: plan } = await supabase
    .from("plans")
    .select("id, product_id, price, min_quantity, billing_period, billing_interval")
    .eq("id", values.planId)
    .single();
  if (!plan) return fail("That plan no longer exists.");

  const expiry =
    values.expiryDate ||
    (template?.duration_periods ? addCycles(values.startDate, plan.billing_period, plan.billing_interval, template.duration_periods) : null);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      customer_id: values.customerId,
      plan_id: values.planId,
      template_id: template?.id ?? null,
      start_date: values.startDate,
      expiry_date: expiry,
      payment_terms: values.paymentTerms as PaymentTerms,
      notes: values.notes || template?.notes || null,
      salesperson_id: user.id,
    })
    .select("id")
    .single();
  if (error) return fail(dbMessage(error, "We couldn't create the subscription. Try again in a moment."));

  if (template?.quotation_template_lines.length) {
    const lines = await Promise.all(
      [...template.quotation_template_lines]
        .sort((a, b) => a.position - b.position)
        .map(async (l, i) => ({
          subscription_id: data.id,
          product_id: l.product_id,
          variant_id: l.variant_id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price ?? (await priceFor(plan, l.product_id, l.variant_id)) ?? 0,
          position: i,
        })),
    );
    await supabase.from("subscription_lines").insert(lines);
  } else if (plan.product_id) {
    // Start with the plan's own product at its minimum quantity; staff adjust from there.
    await supabase.from("subscription_lines").insert({
      subscription_id: data.id,
      product_id: plan.product_id,
      quantity: plan.min_quantity,
      unit_price: plan.price,
    });
  }

  revalidatePath("/subscriptions");
  redirect(`/subscriptions/${data.id}`);
}

export async function addLine(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(["subscriptionId", "productId", "variantId", "quantity"].map((k) => [k, text(formData, k)]));
  const fail = (error: string): FormState => ({ ok: false, error, values });

  if (!(await staffOnly())) return fail("Only staff can change subscription lines.");
  if (!uuid.test(values.productId)) return fail("Pick a product.");
  const quantity = Number(values.quantity || 1);
  if (!Number.isFinite(quantity) || quantity <= 0) return fail("Quantity has to be more than 0.");
  const variantId = uuid.test(values.variantId) ? values.variantId : null;

  const price = await unitPrice(values.subscriptionId, values.productId, variantId);
  if (price === null) return fail("That product or variant isn't available.");

  const supabase = await createClient();
  const { count } = await supabase
    .from("subscription_lines")
    .select("id", { count: "exact", head: true })
    .eq("subscription_id", values.subscriptionId);
  const { error } = await supabase.from("subscription_lines").insert({
    subscription_id: values.subscriptionId,
    product_id: values.productId,
    variant_id: variantId,
    quantity,
    unit_price: price,
    position: count ?? 0,
  });
  if (error) return fail(dbMessage(error, "We couldn't add the line. Try again in a moment."));
  refresh(values.subscriptionId);
  return { ok: true, data: undefined };
}

export async function setLineQuantity(lineId: string, subscriptionId: string, formData: FormData) {
  if (!(await staffOnly())) return;
  const quantity = Number(formData.get("quantity"));
  if (!Number.isFinite(quantity) || quantity <= 0) return;
  const supabase = await createClient();
  await supabase.from("subscription_lines").update({ quantity }).eq("id", lineId);
  refresh(subscriptionId);
}

export async function removeLine(lineId: string, subscriptionId: string) {
  if (!(await staffOnly())) return;
  const supabase = await createClient();
  await supabase.from("subscription_lines").delete().eq("id", lineId);
  refresh(subscriptionId);
}

const statusWord: Record<SubscriptionStatus, string> = {
  draft: "moved back to draft",
  quotation: "sent as a quotation",
  confirmed: "confirmed",
  active: "activated",
  paused: "paused",
  closed: "closed",
};

export async function setStatus(_: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  const status = text(formData, "status") as SubscriptionStatus;
  const reason = text(formData, "reason");
  if (!(await staffOnly())) return { ok: false, error: "Only staff can change a subscription's status." };
  if (!statusWord[status]) return { ok: false, error: "Unknown status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("subscriptions")
    .update(status === "closed" ? { status, close_reason: reason || null } : { status })
    .eq("id", id);
  if (error) return { ok: false, error: dbMessage(error, "We couldn't change the status. Try again in a moment.") };
  refresh(id);
  return { ok: true, data: undefined, values: { message: `Subscription ${statusWord[status]}.` } };
}

// Renewal reopens a closed subscription for another term of the same length,
// billing from today.
export async function renewSubscription(_: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  if (!(await staffOnly())) return { ok: false, error: "Only staff can renew subscriptions." };
  const supabase = await createClient();
  const { data: sub } = await supabase.from("subscriptions").select("start_date, expiry_date, next_invoice_date").eq("id", id).single();
  if (!sub) return { ok: false, error: "That subscription no longer exists." };

  const now = today();
  let expiry: string | null = null;
  if (sub.expiry_date) {
    const days = (Date.parse(sub.expiry_date) - Date.parse(sub.start_date)) / 86_400_000;
    expiry = new Date(Date.parse(now) + days * 86_400_000).toISOString().slice(0, 10);
  }
  const next = sub.next_invoice_date && sub.next_invoice_date > now ? sub.next_invoice_date : now;

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "active", expiry_date: expiry, next_invoice_date: next })
    .eq("id", id);
  if (error) return { ok: false, error: dbMessage(error, "We couldn't renew the subscription. Try again in a moment.") };
  refresh(id);
  return { ok: true, data: undefined, values: { message: "Renewed. It bills again from today." } };
}

export async function billNow(_: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  if (!(await staffOnly())) return { ok: false, error: "Only staff can bill a subscription." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("bill_now", { p_subscription_id: id });
  if (error) return { ok: false, error: dbMessage(error, "Billing failed. Try again in a moment.") };
  refresh(id);
  revalidatePath("/invoices");
  return {
    ok: true,
    data: undefined,
    values: { message: data ? `${data} draft invoice${data === 1 ? "" : "s"} created.` : "Nothing due yet: the next period hasn't started." },
  };
}
