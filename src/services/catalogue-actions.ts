"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth";
import type { ActionResult, BillingPeriod, ProductType } from "@/types/models";

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
