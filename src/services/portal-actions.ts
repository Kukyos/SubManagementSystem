"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, text } from "@/lib/forms";
import { getCurrentUser } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import type { FormState } from "@/services/catalogue-actions";

async function customerOnly() {
  const user = await getCurrentUser();
  return user?.role === "customer" && user.customerId ? user : null;
}

// Subscribing activates straight away and issues the first invoice, so the
// customer lands on it ready to pay.
export async function subscribe(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(["planId", "variantId", "quantity"].map((k) => [k, text(formData, k)]));
  const fail = (error: string): FormState => ({ ok: false, error, values });

  if (!(await customerOnly())) return fail("Sign in with your customer account to subscribe.");
  if (!uuid.test(values.planId)) return fail("Pick a plan.");
  const quantity = Number(values.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) return fail("Quantity is a whole number from 1 to 500.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("portal_subscribe", {
    p_plan_id: values.planId,
    p_quantity: quantity,
    ...(uuid.test(values.variantId) ? { p_variant_id: values.variantId } : {}),
  });
  if (error) return fail(dbMessage(error, "We couldn't start the subscription. Try again in a moment."));

  revalidatePath("/portal");
  revalidatePath("/portal/invoices");
  redirect(data ? `/portal/invoices/${data}?welcome=1` : "/portal");
}

const actionWord = { pause: "paused", resume: "resumed", cancel: "cancelled" } as const;

export async function subscriptionAction(_: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  const action = text(formData, "action") as keyof typeof actionWord;
  if (!(await customerOnly())) return { ok: false, error: "Sign in with your customer account first." };
  if (!actionWord[action] || !uuid.test(id)) return { ok: false, error: "Unknown action." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("portal_subscription_action", { p_subscription_id: id, p_action: action });
  if (error) return { ok: false, error: dbMessage(error, "That didn't go through. Try again in a moment.") };
  revalidatePath("/portal");
  return { ok: true, data: undefined, values: { message: `Subscription ${actionWord[action]}.` } };
}

export async function updateMyProfile(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(["name", "phone", "company", "address", "city", "taxNumber"].map((k) => [k, text(formData, k)]));
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const user = await customerOnly();
  if (!user) return fail("Sign in with your customer account first.");
  if (!values.name) return fail("Your name can't be blank.");
  if (values.taxNumber && !/^[0-9A-Z]{15}$/i.test(values.taxNumber)) return fail("A GSTIN is 15 letters and digits.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name: values.name,
      phone: values.phone || null,
      company: values.company || null,
      address: values.address || null,
      city: values.city || null,
      tax_number: values.taxNumber ? values.taxNumber.toUpperCase() : null,
    })
    .eq("id", user.customerId!);
  if (error) return fail("We couldn't save your details. Try again in a moment.");
  revalidatePath("/portal/profile");
  return { ok: true, data: undefined, values };
}
