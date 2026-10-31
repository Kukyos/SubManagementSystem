import "server-only";
import { createClient } from "@/lib/supabase/server";
import { orSafe } from "@/lib/forms";
import type {
  Discount,
  ListQuery,
  ListResult,
  Plan,
  Product,
  ProductVariant,
  QuotationTemplate,
  QuotationTemplateLine,
  Tax,
} from "@/types/models";

// Never "*": cost_price isn't selectable (see SCHEMA.md).
const productColumns = "id, name, type, sales_price, tax_id, notes, is_active, created_at";

export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Wildcards in what people type are matched literally.
export const likeTerm = (s: string) => `%${s.replace(/[%_\\]/g, "\\$&")}%`;

export type ProductRow = Product & {
  tax: Pick<Tax, "name" | "rate"> | null;
  variantCount: number;
  costPrice: number | null;
};

export type ProductDetail = Product & { variants: ProductVariant[]; costPrice: number | null };

export type ProductQuery = ListQuery & { show?: "active" | "archived" | "all" };

async function costs() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("product_costs");
  return new Map((data ?? []).map((c) => [c.product_id, Number(c.cost_price)]));
}

export async function listProducts({
  page = 1,
  pageSize = 20,
  search,
  show = "active",
}: ProductQuery = {}): Promise<ListResult<ProductRow>> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select(`${productColumns}, taxes(name, rate), product_variants(count)`, { count: "exact" })
    .order("name")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (show !== "all") query = query.eq("is_active", show === "active");
  if (search) query = query.ilike("name", likeTerm(search));

  const [{ data, count, error }, cost] = await Promise.all([query, costs()]);
  if (error) throw new Error(error.message);

  return {
    total: count ?? 0,
    rows: (data ?? []).map(({ taxes, product_variants, ...p }) => ({
      ...p,
      tax: taxes,
      variantCount: product_variants[0]?.count ?? 0,
      costPrice: cost.get(p.id) ?? null,
    })),
  };
}

export async function getProduct(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();
  const [{ data, error }, cost] = await Promise.all([
    supabase
      .from("products")
      .select(`${productColumns}, product_variants(id, product_id, attribute, value, extra_price)`)
      .eq("id", id)
      .maybeSingle(),
    costs(),
  ]);
  if (error) throw new Error(error.message);
  if (!data) return null;

  const { product_variants, ...product } = data;
  const variants = [...product_variants].sort(
    (a, b) => a.attribute.localeCompare(b.attribute) || a.value.localeCompare(b.value),
  );
  return { ...product, variants, costPrice: cost.get(id) ?? null };
}

export async function listTaxes(): Promise<Tax[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("taxes")
    .select("id, name, rate, is_default, is_active, created_at")
    .order("rate", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}

// For pickers: every active product, plus the one already chosen even if it's
// archived since, so saving the form doesn't silently clear it.
export async function listProductOptions(keepId?: string | null): Promise<Pick<Product, "id" | "name" | "sales_price">[]> {
  const supabase = await createClient();
  let query = supabase.from("products").select("id, name, sales_price").order("name");
  query = keepId && uuid.test(keepId) ? query.or(`is_active.eq.true,id.eq.${keepId}`) : query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

export type PlanRow = Plan & { product: Pick<Product, "id" | "name"> | null; activeCount: number };

export async function listPlans({
  page = 1,
  pageSize = 20,
  search,
  show = "active",
}: ProductQuery = {}): Promise<ListResult<PlanRow>> {
  const supabase = await createClient();
  let query = supabase
    .from("plans")
    .select("*, products(id, name), subscriptions(count)", { count: "exact" })
    .eq("subscriptions.status", "active")
    .order("name")
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (show !== "all") query = query.eq("is_active", show === "active");
  if (search) query = query.ilike("name", likeTerm(search));

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return {
    total: count ?? 0,
    rows: (data ?? []).map(({ products, subscriptions, ...plan }) => ({
      ...plan,
      product: products,
      activeCount: subscriptions[0]?.count ?? 0,
    })),
  };
}

export async function getPlan(id: string): Promise<Plan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("plans").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// For line pickers: every variant, grouped client-side under its product.
export async function listVariantOptions(): Promise<ProductVariant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select("id, product_id, attribute, value, extra_price")
    .order("attribute")
    .order("value");
  if (error) throw new Error(error.message);
  return data;
}

export type TemplateRow = QuotationTemplate & {
  plan: Pick<Plan, "id" | "name" | "billing_period" | "billing_interval"> | null;
  lineCount: number;
  usedCount: number;
};

export async function listTemplates(): Promise<TemplateRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotation_templates")
    .select("*, plans(id, name, billing_period, billing_interval), quotation_template_lines(count), subscriptions(count)")
    .order("name");
  if (error) throw new Error(error.message);
  return data.map(({ plans, quotation_template_lines, subscriptions, ...t }) => ({
    ...t,
    plan: plans,
    lineCount: quotation_template_lines[0]?.count ?? 0,
    usedCount: subscriptions[0]?.count ?? 0,
  }));
}

export type TemplateLineRow = QuotationTemplateLine & { product: string; listPrice: number; variant: string | null; extra: number };
export type TemplateDetail = QuotationTemplate & { lines: TemplateLineRow[] };

export async function getTemplate(id: string): Promise<TemplateDetail | null> {
  const supabase = await createClient();
  const [{ data, error }, lines] = await Promise.all([
    supabase.from("quotation_templates").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("quotation_template_lines")
      .select("*, products(name, sales_price), product_variants(attribute, value, extra_price)")
      .eq("template_id", id)
      .order("position"),
  ]);
  if (error) throw new Error(error.message);
  if (lines.error) throw new Error(lines.error.message);
  if (!data) return null;
  return {
    ...data,
    lines: lines.data.map(({ products, product_variants, ...l }) => ({
      ...l,
      product: products?.name ?? "—",
      listPrice: Number(products?.sales_price ?? 0),
      variant: product_variants ? `${product_variants.attribute}: ${product_variants.value}` : null,
      extra: Number(product_variants?.extra_price ?? 0),
    })),
  };
}

export type DiscountRow = Discount & { productCount: number; subscriptionCount: number };

export async function listDiscounts({ page = 1, pageSize = 20, search, show = "active" }: ProductQuery = {}): Promise<ListResult<DiscountRow>> {
  const supabase = await createClient();
  let query = supabase
    .from("discounts")
    .select("*, discount_products(count), subscription_discounts(count)", { count: "exact" })
    .order("is_active", { ascending: false })
    .order("name")
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (show !== "all") query = query.eq("is_active", show === "active");
  if (search) query = query.or(`name.ilike.${likeTerm(orSafe(search))},code.ilike.${likeTerm(orSafe(search))}`);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return {
    total: count ?? 0,
    rows: (data ?? []).map(({ discount_products, subscription_discounts, ...d }) => ({
      ...d,
      productCount: discount_products[0]?.count ?? 0,
      subscriptionCount: subscription_discounts[0]?.count ?? 0,
    })),
  };
}

export type DiscountDetail = Discount & { productIds: string[] };

export async function getDiscount(id: string): Promise<DiscountDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("discounts").select("*, discount_products(product_id)").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { discount_products, ...d } = data;
  return { ...d, productIds: discount_products.map((p) => p.product_id) };
}

// Subscription-level discounts staff can attach.
export async function listDiscountOptions(): Promise<Discount[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("discounts").select("*").eq("scope", "subscription").eq("is_active", true).order("name");
  if (error) throw new Error(error.message);
  return data;
}
