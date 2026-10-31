import "server-only";
import { createClient } from "@/lib/supabase/server";
import { today } from "@/lib/forms";
import type { Customer, Invoice, ListResult, Plan, Product, ProductVariant, Subscription } from "@/types/models";

// Everything here runs as the signed-in customer, so RLS already limits it to
// their own records. Drafts are staff work in progress and stay hidden.

export type MySubscription = Pick<
  Subscription,
  "id" | "number" | "status" | "start_date" | "expiry_date" | "next_invoice_date" | "quote_valid_until" | "closed_at" | "close_reason"
> & {
  plan: Pick<Plan, "name" | "billing_period" | "billing_interval" | "pausable" | "closable" | "renewable">;
  lines: { description: string; quantity: number; amount: number }[];
  amount: number;
};

export type MyInvoice = Pick<Invoice, "id" | "number" | "status" | "invoice_date" | "due_date" | "total" | "amount_paid" | "period_start" | "period_end">;

export type MyOverview = {
  customer: Customer | null;
  subscriptions: MySubscription[];
  openInvoices: MyInvoice[];
  balance: number;
  overdue: number;
};

export async function myOverview(): Promise<MyOverview> {
  const supabase = await createClient();
  const [customer, subs, invoices] = await Promise.all([
    supabase.from("customers").select("*").maybeSingle(),
    supabase
      .from("subscriptions")
      .select(
        "id, number, status, start_date, expiry_date, next_invoice_date, quote_valid_until, closed_at, close_reason, plans(name, billing_period, billing_interval, pausable, closable, renewable), subscription_lines(description, quantity, amount, products(name))",
      )
      .neq("status", "draft")
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, number, status, invoice_date, due_date, total, amount_paid, period_start, period_end")
      .eq("status", "confirmed")
      .order("due_date"),
  ]);
  for (const r of [customer, subs, invoices]) if (r.error) throw new Error(r.error.message);

  const now = today();
  const open = invoices.data ?? [];
  const owed = (i: MyInvoice) => Number(i.total) - Number(i.amount_paid);
  return {
    customer: customer.data,
    subscriptions: (subs.data ?? []).flatMap(({ plans, subscription_lines, ...s }) =>
      plans
        ? [
            {
              ...s,
              plan: plans,
              lines: subscription_lines.map((l) => ({
                description: l.description || l.products?.name || "Item",
                quantity: Number(l.quantity),
                amount: Number(l.amount),
              })),
              amount: subscription_lines.reduce((n, l) => n + Number(l.amount), 0),
            },
          ]
        : [],
    ),
    openInvoices: open,
    balance: open.reduce((n, i) => n + owed(i), 0),
    overdue: open.filter((i) => i.due_date < now).reduce((n, i) => n + owed(i), 0),
  };
}

export async function listMyInvoices({ page = 1, pageSize = 20 } = {}): Promise<ListResult<MyInvoice>> {
  const supabase = await createClient();
  const { data, count, error } = await supabase
    .from("invoices")
    .select("id, number, status, invoice_date, due_date, total, amount_paid, period_start, period_end", { count: "exact" })
    .neq("status", "draft")
    .order("invoice_date", { ascending: false })
    .order("number", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);
  return { rows: data ?? [], total: count ?? 0 };
}

export type PortalPlan = Plan & { product: Pick<Product, "id" | "name" | "notes"> | null; taxRate: number; variants: ProductVariant[] };

// Plans open for sign-up today: active, inside their availability window, with a product.
export async function listPortalPlans(): Promise<PortalPlan[]> {
  const supabase = await createClient();
  const now = today();
  const { data, error } = await supabase
    .from("plans")
    .select("*, products(id, name, notes, taxes(rate), product_variants(id, product_id, attribute, value, extra_price))")
    .eq("is_active", true)
    .not("product_id", "is", null)
    .or(`available_from.is.null,available_from.lte.${now}`)
    .or(`available_until.is.null,available_until.gte.${now}`)
    .order("price");
  if (error) throw new Error(error.message);
  return data.map(({ products, ...p }) => {
    const product_variants = products?.product_variants ?? [];
    return {
      ...p,
      product: products ? { id: products.id, name: products.name, notes: products.notes } : null,
      taxRate: Number(products?.taxes?.rate ?? 0),
      variants: [...product_variants].sort((a, b) => a.attribute.localeCompare(b.attribute) || a.value.localeCompare(b.value)),
    };
  });
}
