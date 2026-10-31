"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { text } from "@/lib/forms";
import { getCurrentUser } from "@/services/auth";
import type { FormState } from "@/services/catalogue-actions";

const fields = ["id", "name", "email", "phone", "company", "address", "city", "country", "taxNumber", "notes"];

export async function saveCustomer(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(fields.map((k) => [k, text(formData, k)]));
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const user = await getCurrentUser();
  if (user?.role !== "admin" && user?.role !== "staff") return fail("Only staff can change customers.");
  if (!values.name) return fail("Give the customer a name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) return fail("That email doesn't look right.");

  const row = {
    name: values.name,
    email: values.email.toLowerCase(),
    phone: values.phone || null,
    company: values.company || null,
    address: values.address || null,
    city: values.city || null,
    country: values.country || "India",
    tax_number: values.taxNumber.toUpperCase() || null,
    notes: values.notes || null,
  };

  const supabase = await createClient();
  const result = values.id
    ? await supabase.from("customers").update(row).eq("id", values.id).select("id").single()
    : await supabase.from("customers").insert({ ...row, created_by: user.id }).select("id").single();

  if (result.error?.code === "23505") return fail(`A customer with ${row.email} already exists.`);
  if (result.error) return fail("We couldn't save the customer. Try again in a moment.");

  revalidatePath("/customers");
  if (values.id) {
    revalidatePath(`/customers/${values.id}`);
    return { ok: true, data: undefined, values };
  }
  redirect(`/customers/${result.data.id}`);
}
