import "server-only";
import { createClient } from "@/lib/supabase/server";
import { orSafe, today } from "@/lib/forms";
import { likeTerm } from "@/services/catalogue";
import { getTimeline, type TimelineEntry } from "@/services/subscriptions";
import type { BillingRun, Customer, Invoice, InvoiceLine, ListQuery, ListResult, Payment } from "@/types/models";
import type { InvoiceDisplayStatus } from "@/lib/status";

export const invoiceFilters: InvoiceDisplayStatus[] = ["draft", "confirmed", "overdue", "paid", "cancelled"];

export type InvoiceQuery = ListQuery & { status?: InvoiceDisplayStatus; customerId?: string };

export type InvoiceRow = Pick<
  Invoice,
  "id" | "number" | "status" | "invoice_date" | "due_date" | "period_start" | "period_end" | "total" | "amount_paid"
> & { customer: Pick<Customer, "id" | "name"> | null };

const isInvoiceNumber = (s: string) => /^inv[/\d]*$/i.test(s) || /^\d+$/.test(s);

export async function listInvoices({ page = 1, pageSize = 25, search, status, customerId }: InvoiceQuery = {}): Promise<ListResult<InvoiceRow>> {
  const supabase = await createClient();
  const term = search && orSafe(search);
  const byName = term && !isInvoiceNumber(term);
  let query = supabase
    .from("invoices")
    .select(
      `id, number, status, invoice_date, due_date, period_start, period_end, total, amount_paid, ${byName ? "customers!inner(id, name)" : "customers(id, name)"}`,
      { count: "exact" },
    )
    .order("invoice_date", { ascending: false })
    .order("number", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // Overdue isn't stored: it's a confirmed invoice past its due date.
  if (status === "overdue") query = query.eq("status", "confirmed").lt("due_date", today());
  else if (status) query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);
  if (term) query = byName ? query.ilike("customers.name", likeTerm(term)) : query.ilike("number", likeTerm(term));

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return {
    total: count ?? 0,
    rows: (data ?? []).map(({ customers, ...i }) => ({ ...i, customer: customers })),
  };
}

export async function invoiceCounts(): Promise<Record<InvoiceDisplayStatus, number>> {
  const supabase = await createClient();
  const head = () => supabase.from("invoices").select("id", { count: "exact", head: true });
  const [draft, confirmed, overdue, paid, cancelled] = await Promise.all([
    head().eq("status", "draft"),
    head().eq("status", "confirmed"),
    head().eq("status", "confirmed").lt("due_date", today()),
    head().eq("status", "paid"),
    head().eq("status", "cancelled"),
  ]);
  return {
    draft: draft.count ?? 0,
    confirmed: confirmed.count ?? 0,
    overdue: overdue.count ?? 0,
    paid: paid.count ?? 0,
    cancelled: cancelled.count ?? 0,
  };
}

export type InvoicePayment = Pick<Payment, "id" | "method" | "amount" | "paid_on" | "reference" | "note" | "gateway_payment_id"> & {
  recordedBy: string | null;
};

export type InvoiceDetail = Invoice & {
  customer: Customer;
  subscription: { id: string; number: string; plan: string } | null;
  discount: string | null;
  lines: InvoiceLine[];
  payments: InvoicePayment[];
  timeline: TimelineEntry[];
};

export async function getInvoice(id: string): Promise<InvoiceDetail | null> {
  const supabase = await createClient();
  const [invoice, lines, payments, timeline] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, customers(*), subscriptions(id, number, plans(name)), discounts(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("invoice_lines").select("*").eq("invoice_id", id).order("position"),
    supabase
      .from("payments")
      .select("id, method, amount, paid_on, reference, note, gateway_payment_id, profiles(full_name)")
      .eq("invoice_id", id)
      .order("paid_on"),
    getTimeline(id),
  ]);
  for (const r of [invoice, lines, payments]) if (r.error) throw new Error(r.error.message);
  if (!invoice.data || !invoice.data.customers) return null;

  const { customers, subscriptions, discounts, ...inv } = invoice.data;
  return {
    ...inv,
    customer: customers,
    subscription: subscriptions ? { id: subscriptions.id, number: subscriptions.number, plan: subscriptions.plans?.name ?? "" } : null,
    discount: discounts?.name ?? null,
    lines: lines.data ?? [],
    payments: (payments.data ?? []).map(({ profiles, ...p }) => ({ ...p, recordedBy: profiles?.full_name ?? null })),
    timeline,
  };
}

export type BillingRunRow = BillingRun & { ranBy: string | null };

export async function listBillingRuns(limit = 30): Promise<BillingRunRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("billing_runs")
    .select("*, profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data.map(({ profiles, ...r }) => ({ ...r, ranBy: profiles?.full_name ?? null }));
}

// What tonight's run would pick up if it ran now.
export async function billingDue(): Promise<{ due: number; draftInvoices: number }> {
  const supabase = await createClient();
  const now = today();
  const [due, drafts] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .or(`next_invoice_date.lte.${now},and(next_invoice_date.is.null,start_date.lte.${now})`),
    supabase.from("invoices").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);
  return { due: due.count ?? 0, draftInvoices: drafts.count ?? 0 };
}
