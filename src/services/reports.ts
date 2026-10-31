import "server-only";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { isDate, orSafe, today } from "@/lib/forms";
import { invoiceDisplayStatus, invoiceStatus, subscriptionStatus } from "@/lib/status";
import { likeTerm } from "@/services/catalogue";
import type { BillingPeriod, InvoiceStatus, SubscriptionStatus } from "@/types/models";

export type MonthPoint = { month: string; invoiced: number; collected: number; new_subscriptions: number; closed_subscriptions: number };

export type FinanceSummary = {
  from: string;
  to: string;
  active_subscriptions: number;
  mrr: number;
  collected: number;
  invoiced: number;
  outstanding: number;
  overdue_count: number;
  overdue_amount: number;
  draft_invoices: number;
  subscriptions_by_status: Partial<Record<SubscriptionStatus, number>>;
  monthly: MonthPoint[];
  top_plans: { name: string; subscriptions: number; mrr: number }[];
};

export async function getFinanceSummary(from?: string, to?: string): Promise<FinanceSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("finance_summary", {
    ...(from && isDate(from) ? { p_from: from } : {}),
    ...(to && isDate(to) ? { p_to: to } : {}),
  });
  if (error) throw new Error(error.message);
  // jsonb numerics arrive as numbers or strings depending on the column; normalise once here.
  const s = data as unknown as FinanceSummary;
  const n = (v: unknown) => Number(v ?? 0);
  return {
    ...s,
    mrr: n(s.mrr),
    collected: n(s.collected),
    invoiced: n(s.invoiced),
    outstanding: n(s.outstanding),
    overdue_amount: n(s.overdue_amount),
    monthly: s.monthly.map((m) => ({
      month: m.month,
      invoiced: n(m.invoiced),
      collected: n(m.collected),
      new_subscriptions: n(m.new_subscriptions),
      closed_subscriptions: n(m.closed_subscriptions),
    })),
    top_plans: s.top_plans.map((p) => ({ ...p, mrr: n(p.mrr) })),
  };
}

export type SearchHit = {
  kind: "customer" | "subscription" | "invoice";
  id: string;
  title: string;
  detail: string;
  status?: string;
  href: string;
};

// One box for the three things people look up. Five of each, best guess first:
// "SUB-…" and "INV/…" go straight to numbers, anything else matches names.
export async function search(raw: string): Promise<SearchHit[]> {
  const term = orSafe(raw).slice(0, 80);
  if (term.length < 2) return [];
  const supabase = await createClient();
  const like = likeTerm(term);
  const subNumber = /^sub-?\d*$/i.test(term);
  const invNumber = /^inv[/\d]*$/i.test(term) || /^\d+$/.test(term);

  const [customers, subs, invoices] = await Promise.all([
    subNumber || invNumber
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("customers")
          .select("id, name, email, company")
          .or(`name.ilike.${like},email.ilike.${like},company.ilike.${like}`)
          .order("name")
          .limit(5),
    invNumber && !/^\d+$/.test(term)
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("subscriptions")
          .select(`id, number, status, plans(name), ${subNumber || /^\d+$/.test(term) ? "customers(name)" : "customers!inner(name)"}`)
          .ilike(subNumber || /^\d+$/.test(term) ? "number" : "customers.name", like)
          .order("created_at", { ascending: false })
          .limit(5),
    subNumber
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("invoices")
          .select(`id, number, status, due_date, total, ${invNumber ? "customers(name)" : "customers!inner(name)"}`)
          .ilike(invNumber ? "number" : "customers.name", like)
          .order("invoice_date", { ascending: false })
          .limit(5),
  ]);
  for (const r of [customers, subs, invoices]) if (r.error) throw new Error(r.error.message);

  type Named = { customers: { name: string } | null };
  return [
    ...(customers.data ?? []).map((c) => ({
      kind: "customer" as const,
      id: c.id,
      title: c.name,
      detail: [c.company, c.email].filter(Boolean).join(" · "),
      href: `/customers/${c.id}`,
    })),
    ...((subs.data ?? []) as unknown as (Named & { id: string; number: string; status: string; plans: { name: string } | null })[]).map((s) => ({
      kind: "subscription" as const,
      id: s.id,
      title: s.number,
      detail: [s.customers?.name, s.plans?.name].filter(Boolean).join(" · "),
      status: subscriptionStatus[s.status as SubscriptionStatus]?.label,
      href: `/subscriptions/${s.id}`,
    })),
    ...((invoices.data ?? []) as unknown as (Named & { id: string; number: string; status: InvoiceStatus; due_date: string; total: number })[]).map((i) => ({
      kind: "invoice" as const,
      id: i.id,
      title: i.number,
      detail: [i.customers?.name, money(i.total)].filter(Boolean).join(" · "),
      status: invoiceStatus[invoiceDisplayStatus(i.status, i.due_date)].label,
      href: `/invoices/${i.id}`,
    })),
  ];
}

export type ForecastMonth = { month: string; active: number; confirmed: number; invoices: number };

const addPeriod = (d: Date, period: BillingPeriod, n: number) => {
  const x = new Date(d);
  if (period === "daily") x.setUTCDate(x.getUTCDate() + n);
  else if (period === "weekly") x.setUTCDate(x.getUTCDate() + 7 * n);
  else {
    // Same as Postgres date + interval: the day clamps to the end of a shorter month.
    const months = period === "monthly" ? n : 12 * n;
    const day = x.getUTCDate();
    x.setUTCDate(1);
    x.setUTCMonth(x.getUTCMonth() + months);
    const last = new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)).getUTCDate();
    x.setUTCDate(Math.min(day, last));
  }
  return x;
};

// Expected billing for this month and the next ones, walking each subscription's
// periods the way bill_subscription does (start at next_invoice_date, step one
// cycle, stop at expiry). Lines with tax, before discounts. Paused subscriptions
// bill nothing; confirmed ones are counted from their start date, shown apart
// because someone still has to activate them.
export async function revenueForecast(months = 6): Promise<ForecastMonth[]> {
  const supabase = await createClient();
  const taxes = await supabase.from("taxes").select("id, rate");
  if (taxes.error) throw new Error(taxes.error.message);
  const rate = new Map(taxes.data.map((t) => [t.id, Number(t.rate)]));

  const subs = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("subscriptions")
      .select("status, start_date, expiry_date, next_invoice_date, plans(billing_period, billing_interval), subscription_lines(amount, tax_id, products(tax_id))")
      .in("status", ["active", "confirmed"])
      .order("id")
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    subs.push(...data);
    if (data.length < 1000) break;
  }

  const now = new Date(today() + "T00:00:00Z");
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1));
  const out: ForecastMonth[] = Array.from({ length: months }, (_, i) => ({
    month: new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + i, 1)).toISOString().slice(0, 7),
    active: 0,
    confirmed: 0,
    invoices: 0,
  }));

  for (const s of subs) {
    if (!s.plans) continue;
    const perCycle = s.subscription_lines.reduce((sum, l) => {
      const taxId = l.tax_id ?? l.products?.tax_id;
      return sum + Number(l.amount) * (1 + (taxId ? (rate.get(taxId) ?? 0) : 0) / 100);
    }, 0);
    if (perCycle <= 0) continue;
    const expiry = s.expiry_date ? new Date(s.expiry_date + "T00:00:00Z") : null;
    let at = new Date((s.next_invoice_date ?? s.start_date) + "T00:00:00Z");
    for (let guard = 0; at < end && (!expiry || at <= expiry) && guard < 1000; guard++) {
      // Periods already due are billed by tonight's run, so they land in this month.
      const when = at < first ? first : at;
      const i = (when.getUTCFullYear() - first.getUTCFullYear()) * 12 + when.getUTCMonth() - first.getUTCMonth();
      const m = out[i];
      if (m) {
        m[s.status === "active" ? "active" : "confirmed"] += perCycle;
        m.invoices += 1;
      }
      at = addPeriod(at, s.plans.billing_period, s.plans.billing_interval);
    }
  }
  return out.map((m) => ({ ...m, active: Math.round(m.active), confirmed: Math.round(m.confirmed) }));
}
