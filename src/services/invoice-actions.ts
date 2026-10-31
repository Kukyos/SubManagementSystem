"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dbMessage, isDate, text } from "@/lib/forms";
import { getCurrentUser } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import type { FormState } from "@/services/catalogue-actions";
import type { InvoiceStatus, PaymentMethod } from "@/types/models";

async function staffOnly() {
  const user = await getCurrentUser();
  return user && (user.role === "admin" || user.role === "staff") ? user : null;
}

function refresh(id: string) {
  revalidatePath(`/invoices/${id}`);
  revalidatePath("/invoices");
}

export async function setInvoiceStatus(_: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  const status = text(formData, "status") as InvoiceStatus;
  if (!(await staffOnly())) return { ok: false, error: "Only staff can change invoices." };
  if (status !== "confirmed" && status !== "cancelled") return { ok: false, error: "Unknown status." };

  const supabase = await createClient();
  const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
  if (error) return { ok: false, error: dbMessage(error, "We couldn't update the invoice. Try again in a moment.") };
  refresh(id);
  return { ok: true, data: undefined, values: { message: status === "confirmed" ? "Invoice confirmed." : "Invoice cancelled." } };
}

export async function confirmDrafts(ids: string[]) {
  if (!(await staffOnly())) return;
  const valid = ids.filter((id) => uuid.test(id));
  if (!valid.length) return;
  const supabase = await createClient();
  await supabase.from("invoices").update({ status: "confirmed" }).in("id", valid).eq("status", "draft");
  revalidatePath("/invoices");
}

const methods: PaymentMethod[] = ["bank_transfer", "upi", "card", "cash", "cheque"];

export async function recordPayment(_: FormState, formData: FormData): Promise<FormState> {
  const values = Object.fromEntries(
    ["invoiceId", "method", "amount", "paidOn", "reference", "note"].map((k) => [k, text(formData, k)]),
  );
  const fail = (error: string): FormState => ({ ok: false, error, values });

  const user = await staffOnly();
  if (!user) return fail("Only staff can record payments.");
  if (!methods.includes(values.method as PaymentMethod)) return fail("Pick how it was paid.");
  const amount = Math.round(Number(values.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) return fail("Amount has to be more than ₹0.");
  if (!isDate(values.paidOn)) return fail("Pick the date the money arrived.");

  const supabase = await createClient();
  const { data: invoice } = await supabase.from("invoices").select("customer_id").eq("id", values.invoiceId).single();
  if (!invoice) return fail("That invoice no longer exists.");

  const { error } = await supabase.from("payments").insert({
    invoice_id: values.invoiceId,
    customer_id: invoice.customer_id,
    method: values.method as PaymentMethod,
    amount,
    paid_on: values.paidOn,
    reference: values.reference || null,
    note: values.note || null,
    recorded_by: user.id,
  });
  if (error) return fail(dbMessage(error, "We couldn't record the payment. Try again in a moment."));
  refresh(values.invoiceId);
  revalidatePath("/payments");
  return { ok: true, data: undefined };
}

export type RunResult = {
  run_id: string;
  as_of: string;
  subscriptions_billed: number;
  invoices_created: number;
  subscriptions_closed: number;
  failed: { subscription: string; id: string; error: string }[];
};
export type RunState = { ok: true; result: RunResult } | { ok: false; error: string } | null;

export async function runBilling(_: RunState, formData: FormData): Promise<RunState> {
  const asOf = text(formData, "asOf");
  if (!(await staffOnly())) return { ok: false, error: "Only staff can run billing." };
  if (asOf && !isDate(asOf)) return { ok: false, error: "Pick a date from the calendar." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_billing", asOf ? { p_as_of: asOf } : {});
  if (error) return { ok: false, error: dbMessage(error, "The billing run failed. Try again in a moment.") };
  revalidatePath("/billing");
  revalidatePath("/invoices");
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  return { ok: true, result: data as RunResult };
}
