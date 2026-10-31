import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isDate } from "@/lib/forms";
import type { SubscriptionStatus } from "@/types/models";

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
