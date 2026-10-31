import "server-only";
import { createClient } from "@/lib/supabase/server";
import { money } from "@/lib/format";
import { isDate, orSafe } from "@/lib/forms";
import { invoiceDisplayStatus, invoiceStatus, subscriptionStatus } from "@/lib/status";
import { likeTerm } from "@/services/catalogue";
import type { InvoiceStatus, SubscriptionStatus } from "@/types/models";

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
