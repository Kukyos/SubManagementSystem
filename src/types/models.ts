import type { Enums, Tables } from "./database";

export type Profile = Tables<"profiles">;
export type Customer = Tables<"customers">;
export type Tax = Tables<"taxes">;
// cost_price is not readable outside product_costs(), so it's left off the client-facing type.
export type Product = Omit<Tables<"products">, "cost_price">;
export type ProductVariant = Tables<"product_variants">;
export type Plan = Tables<"plans">;
export type QuotationTemplate = Tables<"quotation_templates">;
export type QuotationTemplateLine = Tables<"quotation_template_lines">;
export type Discount = Tables<"discounts">;
export type Subscription = Tables<"subscriptions">;
export type SubscriptionLine = Tables<"subscription_lines">;
export type Invoice = Tables<"invoices">;
export type InvoiceLine = Tables<"invoice_lines">;
export type Payment = Tables<"payments">;
export type ActivityEntry = Tables<"activity_log">;

export type UserRole = Enums<"user_role">;
export type SubscriptionStatus = Enums<"subscription_status">;
export type InvoiceStatus = Enums<"invoice_status">;
export type BillingPeriod = Enums<"billing_period">;
export type PaymentMethod = Enums<"payment_method">;
export type PaymentTerms = Enums<"payment_terms">;
export type ProductType = Enums<"product_type">;
export type DiscountType = Enums<"discount_type">;
export type DiscountScope = Enums<"discount_scope">;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ListQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: string;
};

export type ListResult<T> = { rows: T[]; total: number };
