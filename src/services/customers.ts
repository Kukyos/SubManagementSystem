import "server-only";
import { createClient } from "@/lib/supabase/server";
import { orSafe } from "@/lib/forms";
import { likeTerm } from "@/services/catalogue";
import type { Customer, Invoice, ListQuery, ListResult, Subscription } from "@/types/models";

export type CustomerRow = Pick<Customer, "id" | "name" | "email" | "company" | "city" | "user_id"> & {
  activeCount: number;
  outstanding: number;
  overdue: number;
};

const owed = (invoices: Pick<Invoice, "total" | "amount_paid" | "due_date">[]) => {
  const today = new Date().toISOString().slice(0, 10);
  let outstanding = 0;
  let overdue = 0;
  for (const i of invoices) {
    const due = Number(i.total) - Number(i.amount_paid);
    outstanding += due;
    if (i.due_date < today) overdue += due;
  }
  return { outstanding, overdue };
};

export async function listCustomers({ page = 1, pageSize = 20, search }: ListQuery = {}): Promise<ListResult<CustomerRow>> {
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("id, name, email, company, city, user_id, subscriptions(count), invoices(total, amount_paid, due_date)", { count: "exact" })
    .eq("subscriptions.status", "active")
    .eq("invoices.status", "confirmed")
    .order("name")
    .range((page - 1) * pageSize, page * pageSize - 1);

  const term = search && orSafe(search);
  if (term) {
    const like = likeTerm(term);
    query = query.or(`name.ilike.${like},email.ilike.${like},company.ilike.${like}`);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return {
    total: count ?? 0,
    rows: (data ?? []).map(({ subscriptions, invoices, ...c }) => ({
      ...c,
      activeCount: subscriptions[0]?.count ?? 0,
      ...owed(invoices),
    })),
  };
}

// For the new-subscription picker: every customer, names only.
export async function listCustomerOptions(): Promise<Pick<Customer, "id" | "name" | "company">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("customers").select("id, name, company").order("name").limit(5000);
  if (error) throw new Error(error.message);
  return data;
}

export type CustomerSubscription = Pick<Subscription, "id" | "number" | "status" | "start_date" | "expiry_date" | "next_invoice_date"> & {
  plan: string;
  amount: number;
};

export type CustomerDetail = Customer & {
  subscriptions: CustomerSubscription[];
  invoices: Pick<Invoice, "id" | "number" | "status" | "invoice_date" | "due_date" | "total" | "amount_paid">[];
  invoiceCount: number;
  outstanding: number;
  overdue: number;
  lifetimePaid: number;
};

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  const supabase = await createClient();
  const [customer, subs, invoices, open, paid] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("id, number, status, start_date, expiry_date, next_invoice_date, plans(name), subscription_lines(amount)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, number, status, invoice_date, due_date, total, amount_paid", { count: "exact" })
      .eq("customer_id", id)
      .order("invoice_date", { ascending: false })
      .limit(12),
    supabase.from("invoices").select("total, amount_paid, due_date").eq("customer_id", id).eq("status", "confirmed"),
    supabase.from("payments").select("amount").eq("customer_id", id),
  ]);
  for (const r of [customer, subs, invoices, open, paid]) if (r.error) throw new Error(r.error.message);
  if (!customer.data) return null;

  return {
    ...customer.data,
    subscriptions: (subs.data ?? []).map(({ plans, subscription_lines, ...s }) => ({
      ...s,
      plan: plans?.name ?? "—",
      amount: subscription_lines.reduce((sum, l) => sum + Number(l.amount), 0),
    })),
    invoices: invoices.data ?? [],
    invoiceCount: invoices.count ?? 0,
    ...owed(open.data ?? []),
    lifetimePaid: (paid.data ?? []).reduce((sum, p) => sum + Number(p.amount), 0),
  };
}
