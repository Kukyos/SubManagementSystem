"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import type { ActionResult, BillingPeriod, DiscountScope, DiscountType, PaymentTerms, ProductType } from "@/types/models";

export type FormState = (ActionResult & { values?: Record<string, string> }) | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const productTypes: ProductType[] = ["service", "goods", "addon"];

// RLS turns a non-admin write into "0 rows changed" with no error, so say no up front.
async function adminOnly() {
  const user = await getCurrentUser();
  return user?.role === "admin" ? null : "Only an admin can change the catalogue.";
}

function price(raw: string, label: string) {
  if (raw === "") return { value: 0 };
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return { error: `${label} must be a number of rupees, 0 or more.` };
  return { value: Math.round(value * 100) / 100 };
}

export async function saveProduct(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["id", "name", "type", "salesPrice", "costPrice", "taxId", "notes"].map((k) => [k, text(formData, k)]),
  );
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const denied = await adminOnly();
  if (denied) return fail(denied);
  if (!values.name) return fail("Give the product a name.");
  if (!productTypes.includes(values.type as ProductType)) return fail("Pick a product type.");
  const sales = price(values.salesPrice, "Sales price");
  if (sales.error) return fail(sales.error);
  const cost = price(values.costPrice, "Cost price");
  if (cost.error) return fail(cost.error);

  const row = {
    name: values.name,
    type: values.type as ProductType,
    sales_price: sales.value!,
    cost_price: cost.value!,
    tax_id: values.taxId || null,
    notes: values.notes || null,
  };

  // Insert or update, never upsert: ON CONFLICT reads cost_price, which nobody may select.
  const supabase = await createClient();
  if (values.id) {
    const { error } = await supabase.from("products").update(row).eq("id", values.id);
    if (error) return fail("We couldn't save the product. Try again in a moment.");
    revalidatePath("/products");
    revalidatePath(`/products/${values.id}`);
    return { ok: true, data: undefined, values };
  }

  const { data, error } = await supabase.from("products").insert(row).select("id").single();
  if (error) return fail("We couldn't create the product. Try again in a moment.");
  revalidatePath("/products");
  redirect(`/products/${data.id}`);
}

export async function archiveProduct(id: string, archived = true) {
  if (await adminOnly()) return;
  const supabase = await createClient();
  await supabase.from("products").update({ is_active: !archived }).eq("id", id);
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
}

export async function saveVariant(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["productId", "attribute", "value", "extraPrice"].map((k) => [k, text(formData, k)]),
  );
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const denied = await adminOnly();
  if (denied) return fail(denied);
  if (!values.attribute || !values.value) return fail("A variant needs an attribute and a value, like Brand: Odoo.");
  const extra = price(values.extraPrice, "Extra price");
  if (extra.error) return fail(extra.error);

  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").insert({
    product_id: values.productId,
    attribute: values.attribute,
    value: values.value,
    extra_price: extra.value!,
  });
  if (error?.code === "23505") return fail(`This product already has ${values.attribute}: ${values.value}.`);
  if (error) return fail("We couldn't add the variant. Try again in a moment.");

  revalidatePath(`/products/${values.productId}`);
  revalidatePath("/products");
  return { ok: true, data: undefined };
}

export async function deleteVariant(id: string, productId: string) {
  if (await adminOnly()) return;
  const supabase = await createClient();
  await supabase.from("product_variants").delete().eq("id", id);
  revalidatePath(`/products/${productId}`);
  revalidatePath("/products");
}

const periods: BillingPeriod[] = ["daily", "weekly", "monthly", "yearly"];
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export async function savePlan(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    [
      "id", "name", "productId", "price", "billingPeriod", "billingInterval",
      "minQuantity", "availableFrom", "availableUntil", "description",
    ].map((k) => [k, text(formData, k)]),
  );
  const flags = ["autoClose", "closable", "pausable", "renewable", "isActive"] as const;
  for (const f of flags) values[f] = formData.get(f) ? "on" : "";
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const denied = await adminOnly();
  if (denied) return fail(denied);
  if (!values.name) return fail("Give the plan a name.");
  if (!periods.includes(values.billingPeriod as BillingPeriod)) return fail("Pick how often the plan bills.");
  const amount = price(values.price, "Price");
  if (amount.error) return fail(amount.error);
  const interval = Number(values.billingInterval || 1);
  if (!Number.isInteger(interval) || interval < 1 || interval > 36) return fail("Bill every 1 to 36 periods.");
  const minQty = Number(values.minQuantity || 1);
  if (!Number.isInteger(minQty) || minQty < 1) return fail("Minimum quantity is a whole number, 1 or more.");
  for (const k of ["availableFrom", "availableUntil"]) if (values[k] && !isDate(values[k])) return fail("Dates look wrong. Pick them from the calendar.");
  if (values.availableFrom && values.availableUntil && values.availableUntil < values.availableFrom)
    return fail("The plan can't stop being available before it starts.");

  const row = {
    name: values.name,
    product_id: values.productId || null,
    price: amount.value!,
    billing_period: values.billingPeriod as BillingPeriod,
    billing_interval: interval,
    min_quantity: minQty,
    available_from: values.availableFrom || null,
    available_until: values.availableUntil || null,
    auto_close: !!values.autoClose,
    closable: !!values.closable,
    pausable: !!values.pausable,
    renewable: !!values.renewable,
    is_active: !!values.isActive,
    description: values.description || null,
  };

  const supabase = await createClient();
  if (values.id) {
    const { error } = await supabase.from("plans").update(row).eq("id", values.id);
    if (error) return fail("We couldn't save the plan. Try again in a moment.");
    revalidatePath("/plans");
    revalidatePath(`/plans/${values.id}`);
    return { ok: true, data: undefined, values };
  }

  const { data, error } = await supabase.from("plans").insert(row).select("id").single();
  if (error) return fail("We couldn't create the plan. Try again in a moment.");
  revalidatePath("/plans");
  redirect(`/plans/${data.id}`);
}

export async function saveTax(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(["id", "name", "rate"].map((k) => [k, text(formData, k)]));
  for (const f of ["isDefault", "isActive"]) values[f] = formData.get(f) ? "on" : "";
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const denied = await adminOnly();
  if (denied) return fail(denied);
  if (!values.name) return fail("Give the tax a name, like GST 18%.");
  const rate = Number(values.rate);
  if (values.rate === "" || !Number.isFinite(rate) || rate < 0 || rate > 100) return fail("Rate is a percentage from 0 to 100.");
  if (values.isDefault && !values.isActive) return fail("The default tax has to be active.");

  const supabase = await createClient();
  // Only one default is allowed (unique index), so clear the old one first.
  if (values.isDefault) {
    let clear = supabase.from("taxes").update({ is_default: false }).eq("is_default", true);
    if (values.id) clear = clear.neq("id", values.id);
    await clear;
  }
  const row = { name: values.name, rate: Math.round(rate * 100) / 100, is_default: !!values.isDefault, is_active: !!values.isActive };
  const { error } = values.id
    ? await supabase.from("taxes").update(row).eq("id", values.id)
    : await supabase.from("taxes").insert(row);
  if (error) return fail("We couldn't save the tax. Try again in a moment.");

  revalidatePath("/settings");
  revalidatePath("/products");
  return { ok: true, data: undefined, values: values.id ? values : undefined };
}

const paymentTerms: PaymentTerms[] = ["immediate", "net_7", "net_15", "net_30", "net_45", "net_60"];

export async function saveTemplate(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["id", "name", "planId", "validityDays", "durationPeriods", "paymentTerms", "notes"].map((k) => [k, text(formData, k)]),
  );
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const denied = await adminOnly();
  if (denied) return fail(denied);
  if (!values.name) return fail("Give the template a name.");
  if (!uuid.test(values.planId)) return fail("Pick the plan this template sells.");
  const validity = Number(values.validityDays || 30);
  if (!Number.isInteger(validity) || validity < 1 || validity > 365) return fail("A quotation stays valid for 1 to 365 days.");
  const duration = values.durationPeriods ? Number(values.durationPeriods) : null;
  if (duration !== null && (!Number.isInteger(duration) || duration < 1 || duration > 120))
    return fail("Contract length is 1 to 120 billing cycles, or blank for open-ended.");
  if (!paymentTerms.includes(values.paymentTerms as PaymentTerms)) return fail("Pick payment terms.");

  const row = {
    name: values.name,
    plan_id: values.planId,
    validity_days: validity,
    duration_periods: duration,
    payment_terms: values.paymentTerms as PaymentTerms,
    notes: values.notes || null,
  };
  const supabase = await createClient();
  if (values.id) {
    const { error } = await supabase.from("quotation_templates").update(row).eq("id", values.id);
    if (error) return fail("We couldn't save the template. Try again in a moment.");
    revalidatePath("/templates");
    revalidatePath(`/templates/${values.id}`);
    return { ok: true, data: undefined, values };
  }

  const { data, error } = await supabase.from("quotation_templates").insert(row).select("id").single();
  if (error) return fail("We couldn't create the template. Try again in a moment.");
  // Start it with the plan's own product, like a new subscription.
  const { data: plan } = await supabase.from("plans").select("product_id, min_quantity").eq("id", values.planId).single();
  if (plan?.product_id)
    await supabase.from("quotation_template_lines").insert({ template_id: data.id, product_id: plan.product_id, quantity: plan.min_quantity });
  revalidatePath("/templates");
  redirect(`/templates/${data.id}`);
}

export async function addTemplateLine(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(["templateId", "productId", "variantId", "quantity", "unitPrice"].map((k) => [k, text(formData, k)]));
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const denied = await adminOnly();
  if (denied) return fail(denied);
  if (!values.productId) return fail("Pick a product.");
  const quantity = Number(values.quantity || 1);
  if (!Number.isFinite(quantity) || quantity <= 0) return fail("Quantity has to be more than 0.");
  const unit = values.unitPrice === "" ? null : price(values.unitPrice, "Unit price");
  if (unit?.error) return fail(unit.error);

  const supabase = await createClient();
  if (values.variantId) {
    const { data: variant } = await supabase.from("product_variants").select("product_id").eq("id", values.variantId).maybeSingle();
    if (variant?.product_id !== values.productId) return fail("That variant belongs to another product.");
  }
  const { count } = await supabase
    .from("quotation_template_lines")
    .select("id", { count: "exact", head: true })
    .eq("template_id", values.templateId);
  const { error } = await supabase.from("quotation_template_lines").insert({
    template_id: values.templateId,
    product_id: values.productId,
    variant_id: values.variantId || null,
    quantity,
    unit_price: unit?.value ?? null,
    position: count ?? 0,
  });
  if (error) return fail("We couldn't add the line. Try again in a moment.");
  revalidatePath(`/templates/${values.templateId}`);
  revalidatePath("/templates");
  return { ok: true, data: undefined };
}

export async function removeTemplateLine(id: string, templateId: string) {
  if (await adminOnly()) return;
  const supabase = await createClient();
  await supabase.from("quotation_template_lines").delete().eq("id", id);
  revalidatePath(`/templates/${templateId}`);
  revalidatePath("/templates");
}

export async function saveDiscount(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["id", "name", "code", "type", "value", "scope", "minPurchase", "minQuantity", "startsOn", "endsOn", "usageLimit"].map((k) => [k, text(formData, k)]),
  );
  values.isActive = formData.get("isActive") ? "on" : "";
  const productIds = formData.getAll("productIds").map(String).filter((id) => uuid.test(id));
  values.productIds = productIds.join(",");
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const denied = await adminOnly();
  if (denied) return fail(denied);
  if (!values.name) return fail("Give the discount a name.");
  if (!["percent", "fixed"].includes(values.type)) return fail("Pick percent or a fixed amount.");
  if (!["products", "subscription"].includes(values.scope)) return fail("Pick what the discount applies to.");
  const amount = Number(values.value);
  if (!Number.isFinite(amount) || amount <= 0) return fail("The discount has to be more than 0.");
  if (values.type === "percent" && amount > 100) return fail("A percentage discount can't be more than 100%.");
  const minPurchase = price(values.minPurchase, "Minimum purchase");
  if (minPurchase.error) return fail(minPurchase.error);
  const minQty = Number(values.minQuantity || 0);
  if (!Number.isFinite(minQty) || minQty < 0) return fail("Minimum quantity is 0 or more.");
  for (const k of ["startsOn", "endsOn"]) if (values[k] && !isDate(values[k])) return fail("Dates look wrong. Pick them from the calendar.");
  if (values.startsOn && values.endsOn && values.endsOn < values.startsOn) return fail("The discount can't end before it starts.");
  const limit = values.usageLimit ? Number(values.usageLimit) : null;
  if (limit !== null && (!Number.isInteger(limit) || limit < 1)) return fail("Usage limit is a whole number, or blank for no limit.");
  if (values.scope === "products" && productIds.length === 0) return fail("Pick at least one product the discount covers.");

  const row = {
    name: values.name,
    code: values.code ? values.code.toUpperCase() : null,
    type: values.type as DiscountType,
    value: Math.round(amount * 100) / 100,
    scope: values.scope as DiscountScope,
    min_purchase: minPurchase.value!,
    min_quantity: minQty,
    starts_on: values.startsOn || null,
    ends_on: values.endsOn || null,
    usage_limit: limit,
    is_active: !!values.isActive,
  };

  const supabase = await createClient();
  let id = values.id;
  if (id) {
    const { error } = await supabase.from("discounts").update(row).eq("id", id);
    if (error?.code === "23505") return fail(`Another discount already uses the code ${row.code}.`);
    if (error) return fail("We couldn't save the discount. Try again in a moment.");
  } else {
    const { data, error } = await supabase.from("discounts").insert(row).select("id").single();
    if (error?.code === "23505") return fail(`Another discount already uses the code ${row.code}.`);
    if (error) return fail("We couldn't create the discount. Try again in a moment.");
    id = data.id;
  }

  // Product coverage is replaced wholesale; a subscription-scope discount covers none.
  await supabase.from("discount_products").delete().eq("discount_id", id);
  if (row.scope === "products")
    await supabase.from("discount_products").insert(productIds.map((product_id) => ({ discount_id: id, product_id })));

  revalidatePath("/discounts");
  revalidatePath(`/discounts/${id}`);
  if (!values.id) redirect(`/discounts/${id}`);
  return { ok: true, data: undefined, values };
}
