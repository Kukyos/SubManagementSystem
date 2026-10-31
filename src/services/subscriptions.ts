import "server-only";
import { createClient } from "@/lib/supabase/server";
import { orSafe } from "@/lib/forms";
import { likeTerm } from "@/services/catalogue";
import type {
  ActivityEntry,
  Customer,
  Invoice,
  ListQuery,
  ListResult,
  Plan,
  Subscription,
  SubscriptionLine,
  SubscriptionStatus,
} from "@/types/models";

export const subscriptionStatuses: SubscriptionStatus[] = ["draft", "quotation", "confirmed", "active", "paused", "closed"];

export type SubscriptionQuery = ListQuery & { status?: SubscriptionStatus; planId?: string; customerId?: string };

export type SubscriptionRow = Pick<
  Subscription,
  "id" | "number" | "status" | "start_date" | "expiry_date" | "next_invoice_date" | "quote_valid_until"
> & { customer: Pick<Customer, "id" | "name" | "company"> | null; plan: string; amount: number };

export async function listSubscriptions({
  page = 1,
  pageSize = 20,
  search,
  status,
  planId,
  customerId,
}: SubscriptionQuery = {}): Promise<ListResult<SubscriptionRow>> {
  const supabase = await createClient();
  const term = search && orSafe(search);
  // Searching by customer name needs an inner join so the filter drops rows.
  const customerEmbed = term && !/^sub-?\d*$/i.test(term) ? "customers!inner(id, name, company)" : "customers(id, name, company)";
  let query = supabase
    .from("subscriptions")
    .select(
      `id, number, status, start_date, expiry_date, next_invoice_date, quote_valid_until, ${customerEmbed}, plans(name), subscription_lines(amount)`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq("status", status);
  if (planId) query = query.eq("plan_id", planId);
  if (customerId) query = query.eq("customer_id", customerId);
  if (term) query = /^sub-?\d*$/i.test(term) ? query.ilike("number", likeTerm(term)) : query.ilike("customers.name", likeTerm(term));

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return {
    total: count ?? 0,
    rows: (data ?? []).map(({ customers, plans, subscription_lines, ...s }) => ({
      ...s,
      customer: customers,
      plan: plans?.name ?? "—",
      amount: subscription_lines.reduce((sum, l) => sum + Number(l.amount), 0),
    })),
  };
}

// One count per status for the pipeline strip above the list.
export async function subscriptionCounts(): Promise<Record<SubscriptionStatus, number>> {
  const supabase = await createClient();
  const counts = await Promise.all(
    subscriptionStatuses.map((s) =>
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", s),
    ),
  );
  return Object.fromEntries(subscriptionStatuses.map((s, i) => [s, counts[i].count ?? 0])) as Record<SubscriptionStatus, number>;
}

export type SubscriptionLineRow = SubscriptionLine & {
  product: string;
  variant: string | null;
  taxRate: number;
};

export type SubscriptionDetail = Subscription & {
  customer: Pick<Customer, "id" | "name" | "email" | "company">;
  plan: Plan;
  salesperson: string | null;
  lines: SubscriptionLineRow[];
  invoices: Pick<Invoice, "id" | "number" | "status" | "invoice_date" | "due_date" | "period_start" | "period_end" | "total" | "amount_paid">[];
  timeline: TimelineEntry[];
};

export type TimelineEntry = Pick<ActivityEntry, "id" | "action" | "from_status" | "to_status" | "message" | "created_at"> & {
  actor: string | null;
};

export async function getTimeline(entityId: string): Promise<TimelineEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, action, from_status, to_status, message, created_at, profiles(full_name)")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data.map(({ profiles, ...e }) => ({ ...e, actor: profiles?.full_name ?? null }));
}

export async function getSubscription(id: string): Promise<SubscriptionDetail | null> {
  const supabase = await createClient();
  const [sub, lines, invoices, timeline] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, customers(id, name, email, company), plans(*), profiles(full_name)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("subscription_lines")
      .select("*, products(name, taxes(rate)), product_variants(attribute, value), taxes(rate)")
      .eq("subscription_id", id)
      .order("position"),
    supabase
      .from("invoices")
      .select("id, number, status, invoice_date, due_date, period_start, period_end, total, amount_paid")
      .eq("subscription_id", id)
      .order("invoice_date", { ascending: false })
      .limit(24),
    getTimeline(id),
  ]);
  for (const r of [sub, lines, invoices]) if (r.error) throw new Error(r.error.message);
  if (!sub.data || !sub.data.customers || !sub.data.plans) return null;

  const { customers, plans, profiles, ...s } = sub.data;
  return {
    ...s,
    customer: customers,
    plan: plans,
    salesperson: profiles?.full_name ?? null,
    lines: (lines.data ?? []).map(({ products, product_variants, taxes, ...l }) => ({
      ...l,
      product: products?.name ?? "—",
      variant: product_variants ? `${product_variants.attribute}: ${product_variants.value}` : null,
      taxRate: Number(taxes?.rate ?? products?.taxes?.rate ?? 0),
    })),
    invoices: invoices.data ?? [],
    timeline,
  };
}
