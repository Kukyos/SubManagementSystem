import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isDate, orSafe, today } from "@/lib/forms";
import { likeTerm } from "@/services/catalogue";
import type { Customer, Invoice, ListQuery, ListResult, Payment, PaymentMethod } from "@/types/models";

export const paymentMethods: PaymentMethod[] = ["bank_transfer", "upi", "card", "cheque", "cash", "online"];

export type PaymentQuery = ListQuery & { method?: PaymentMethod; from?: string; to?: string };

export type PaymentRow = Pick<Payment, "id" | "amount" | "method" | "paid_on" | "reference" | "note"> & {
  invoice: Pick<Invoice, "id" | "number"> | null;
  customer: Pick<Customer, "id" | "name"> | null;
  recordedBy: string | null;
};

export async function listPayments({
  page = 1,
  pageSize = 25,
  search,
  method,
  from,
  to,
}: PaymentQuery = {}): Promise<ListResult<PaymentRow>> {
  const supabase = await createClient();
  const term = search && orSafe(search);
  const byInvoice = term && /^inv[/\d]*$/i.test(term);

  let query = supabase
    .from("payments")
    // Every payment has an invoice and a customer, so inner joins drop nothing until a search filters them.
    .select("id, amount, method, paid_on, reference, note, invoices!inner(id, number), customers!inner(id, name), profiles(full_name)", {
      count: "exact",
    })
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (method) query = query.eq("method", method);
  if (from && isDate(from)) query = query.gte("paid_on", from);
  if (to && isDate(to)) query = query.lte("paid_on", to);
  if (term) query = byInvoice ? query.ilike("invoices.number", likeTerm(term)) : query.ilike("customers.name", likeTerm(term));

  const list = await query;
  if (list.error) throw new Error(list.error.message);

  return {
    total: list.count ?? 0,
    rows: list.data.map(({ invoices, customers, profiles, ...p }) => ({
      ...p,
      invoice: invoices,
      customer: customers,
      recordedBy: profiles?.full_name ?? null,
    })),
  };
}

export type OverdueInvoice = Pick<Invoice, "id" | "number" | "due_date"> & {
  customer: Pick<Customer, "id" | "name"> | null;
  balance: number;
  daysLate: number;
};

export type Aging = {
  buckets: { label: string; count: number; amount: number }[];
  total: number;
  count: number;
  oldest: OverdueInvoice[];
};

const bucketEdges = [
  { label: "1–30 days", max: 30 },
  { label: "31–60 days", max: 60 },
  { label: "61–90 days", max: 90 },
  { label: "Over 90 days", max: Infinity },
];

// Overdue = confirmed and past due. A few hundred rows, so bucketed here
// (PostgREST returns at most 1,000; move this into SQL if overdue ever grows past that).
export async function overdueAging(): Promise<Aging> {
  const supabase = await createClient();
  const now = today();
  const { data, error } = await supabase
    .from("invoices")
    .select("id, number, due_date, total, amount_paid, customers(id, name)")
    .eq("status", "confirmed")
    .lt("due_date", now)
    .order("due_date");
  if (error) throw new Error(error.message);

  const nowMs = Date.parse(now);
  const rows: OverdueInvoice[] = data.map(({ customers, total, amount_paid, ...i }) => ({
    ...i,
    customer: customers,
    balance: Number(total) - Number(amount_paid),
    daysLate: Math.round((nowMs - Date.parse(i.due_date)) / 86_400_000),
  }));
  const buckets = bucketEdges.map((b) => ({ label: b.label, count: 0, amount: 0 }));
  for (const r of rows) {
    const b = buckets[bucketEdges.findIndex((e) => r.daysLate <= e.max)];
    b.count += 1;
    b.amount += r.balance;
  }
  return {
    buckets,
    total: rows.reduce((n, r) => n + r.balance, 0),
    count: rows.length,
    oldest: rows.slice(0, 8),
  };
}
