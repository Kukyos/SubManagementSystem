"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { date, money } from "@/lib/format";
import { dbMessage, isDate, text } from "@/lib/forms";
import { invoicePdf, pdfName } from "@/lib/invoice-pdf";
import { emailLayout, mailConfigured, sendMail, siteUrl } from "@/lib/mailer";
import { invoiceDisplayStatus } from "@/lib/status";
import { getCurrentUser } from "@/services/auth";
import { uuid } from "@/services/catalogue";
import type { FormState } from "@/services/catalogue-actions";
import { getInvoice } from "@/services/invoices";
import { overdueByCustomer } from "@/services/payments";
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

// Emails the invoice as a PDF to the customer and stamps sent_at.
export async function sendInvoice(_: FormState, formData: FormData): Promise<FormState> {
  const id = text(formData, "id");
  if (!(await staffOnly())) return { ok: false, error: "Only staff can send invoices." };
  if (!uuid.test(id)) return { ok: false, error: "That invoice no longer exists." };
  if (!mailConfigured()) return { ok: false, error: "Email isn't set up on this server yet. Download the PDF and send it yourself for now." };

  const inv = await getInvoice(id);
  if (!inv) return { ok: false, error: "That invoice no longer exists." };
  if (inv.status === "draft") return { ok: false, error: "Confirm the invoice before sending it." };
  if (inv.status === "cancelled") return { ok: false, error: "Cancelled invoices aren't sent." };

  const balance = Number(inv.total) - Number(inv.amount_paid);
  const overdue = invoiceDisplayStatus(inv.status, inv.due_date) === "overdue";
  const { html, text: plain } = emailLayout({
    eyebrow: inv.status === "paid" ? "Receipt" : overdue ? "Overdue" : "New invoice",
    heading: inv.status === "paid" ? `Invoice ${inv.number}, paid` : `Invoice ${inv.number} for ${money(inv.total)}`,
    lines: [
      `Hi ${inv.customer.name.split(" ")[0]},`,
      inv.status === "paid"
        ? `Here's your invoice for your records. It was paid in full on ${date(inv.paid_at)}.`
        : `Your invoice${inv.subscription ? ` for ${inv.subscription.plan}` : ""} is attached. ${money(balance)} is ${overdue ? "overdue since" : "due by"} ${date(inv.due_date)}.`,
      "You can view it and see how to pay from your account.",
    ],
    button: { label: inv.status === "paid" ? "View invoice" : "View and pay", href: `${siteUrl()}/portal/invoices/${inv.id}` },
  });

  try {
    await sendMail({
      to: inv.customer.email,
      subject: inv.status === "paid" ? `Invoice ${inv.number} (paid)` : `Invoice ${inv.number} from Brightloop`,
      html,
      text: plain,
      attachments: [{ filename: pdfName(inv.number), content: Buffer.from(await invoicePdf(inv)), contentType: "application/pdf" }],
    });
  } catch {
    return { ok: false, error: "The email didn't go out. Check the address and try again in a moment." };
  }

  const supabase = await createClient();
  await supabase.from("invoices").update({ sent_at: new Date().toISOString() }).eq("id", id);
  refresh(id);
  return { ok: true, data: undefined, values: { message: `Sent to ${inv.customer.email}.` } };
}

// One email per customer listing everything they owe that's past due, oldest
// debt first. A few go out at once over one pooled SMTP connection.
export async function sendOverdueReminders(_: FormState, formData: FormData): Promise<FormState> {
  void formData;
  if (!(await staffOnly())) return { ok: false, error: "Only staff can send reminders." };
  if (!mailConfigured()) return { ok: false, error: "Email isn't set up on this server yet (SMTP_USER and SMTP_PASS)." };

  const customers = await overdueByCustomer();
  if (!customers.length) return { ok: true, data: undefined, values: { message: "Nothing is overdue. No reminders needed." } };

  const failed: string[] = [];
  const remind = async (c: (typeof customers)[number]) => {
    const oldest = c.invoices[0];
    const { html, text: plain } = emailLayout({
      eyebrow: "Payment reminder",
      heading: `${money(c.balance)} is overdue`,
      lines: [
        `Hi ${c.name.split(" ")[0]},`,
        c.invoices.length === 1
          ? `Invoice ${oldest.number} was due on ${date(oldest.due_date)} and ${money(oldest.balance)} of it is still open.`
          : `${c.invoices.length} invoices are past their due date. The oldest, ${oldest.number}, was due on ${date(oldest.due_date)}.`,
        ...c.invoices.slice(0, 6).map((i) => `• ${i.number}: ${money(i.balance)}, ${i.daysLate} day${i.daysLate === 1 ? "" : "s"} late`),
        ...(c.invoices.length > 6 ? [`…and ${c.invoices.length - 6} more in your account.`] : []),
        "If you've already paid, thank you, and please ignore this. Otherwise the details and how to pay are in your account.",
      ],
      button: { label: "View and pay", href: c.invoices.length === 1 ? `${siteUrl()}/portal/invoices/${oldest.id}` : `${siteUrl()}/portal/invoices` },
    });
    try {
      await sendMail({ to: c.email, subject: `Reminder: ${money(c.balance)} overdue with Brightloop`, html, text: plain });
    } catch {
      failed.push(c.name);
    }
  };
  for (let i = 0; i < customers.length; i += 5) await Promise.all(customers.slice(i, i + 5).map(remind));

  revalidatePath("/payments");
  const sent = customers.length - failed.length;
  const missed = failed.length ? ` Couldn't reach ${failed.slice(0, 3).join(", ")}${failed.length > 3 ? ` and ${failed.length - 3} more` : ""}.` : "";
  if (!sent) return { ok: false, error: `No reminders went out.${missed} Try again in a moment.` };
  return { ok: true, data: undefined, values: { message: `Reminded ${sent} customer${sent === 1 ? "" : "s"}.${missed}` } };
}
