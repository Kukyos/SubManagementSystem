import "server-only";
import { isDate, today } from "@/lib/forms";
import { toCsv } from "@/lib/csv";
import { invoiceDisplayStatus, invoiceStatus, methodLabel, subscriptionStatus, type InvoiceDisplayStatus } from "@/lib/status";
import { uuid } from "@/services/catalogue";
import { listCustomers } from "@/services/customers";
import { invoiceFilters, listInvoices } from "@/services/invoices";
import { listPayments, paymentMethods } from "@/services/payments";
import { listSubscriptions, subscriptionStatuses } from "@/services/subscriptions";
import type { ListResult, PaymentMethod, SubscriptionStatus } from "@/types/models";

export const exportLists = ["customers", "subscriptions", "invoices", "payments"] as const;
export type ExportList = (typeof exportLists)[number];

// PostgREST returns at most 1,000 rows a request, so exports walk the pages.
const batch = 1000;
const maxRows = 50_000;

async function all<T>(fetch: (page: number) => Promise<ListResult<T>>) {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const r = await fetch(page);
    rows.push(...r.rows);
    if (r.rows.length < batch || rows.length >= r.total || rows.length >= maxRows) return rows;
  }
}

const amount = (n: number) => Number(n).toFixed(2);

// Takes the same query string as the list page, so the file matches what's on screen (every page of it).
export async function exportCsv(list: ExportList, params: URLSearchParams): Promise<{ filename: string; csv: string }> {
  const search = params.get("q")?.trim() || undefined;
  const stamp = today();

  if (list === "customers") {
    const rows = await all((page) => listCustomers({ page, pageSize: batch, search }));
    return {
      filename: `customers-${stamp}.csv`,
      csv: toCsv(
        ["Name", "Email", "Company", "City", "Portal login", "Active subscriptions", "Outstanding (INR)", "Overdue (INR)"],
        rows.map((c) => [c.name, c.email, c.company, c.city, c.user_id ? "Yes" : "No", c.activeCount, amount(c.outstanding), amount(c.overdue)]),
      ),
    };
  }

  if (list === "subscriptions") {
    const s = params.get("status") as SubscriptionStatus;
    const status = subscriptionStatuses.includes(s) ? s : undefined;
    const plan = params.get("plan");
    const planId = plan && uuid.test(plan) ? plan : undefined;
    const rows = await all((page) => listSubscriptions({ page, pageSize: batch, search, status, planId }));
    return {
      filename: `subscriptions-${status ?? "all"}-${stamp}.csv`,
      csv: toCsv(
        ["Number", "Customer", "Company", "Plan", "Status", "Start", "Expiry", "Next invoice", "Amount per cycle (INR)"],
        rows.map((r) => [
          r.number,
          r.customer?.name,
          r.customer?.company,
          r.plan,
          subscriptionStatus[r.status].label,
          r.start_date,
          r.expiry_date,
          r.next_invoice_date,
          amount(r.amount),
        ]),
      ),
    };
  }

  if (list === "invoices") {
    const s = params.get("status") as InvoiceDisplayStatus;
    const status = invoiceFilters.includes(s) ? s : undefined;
    const customer = params.get("customer");
    const customerId = customer && uuid.test(customer) ? customer : undefined;
    const rows = await all((page) => listInvoices({ page, pageSize: batch, search, status, customerId }));
    return {
      filename: `invoices-${status ?? "all"}-${stamp}.csv`,
      csv: toCsv(
        ["Number", "Customer", "Status", "Invoice date", "Due date", "Period start", "Period end", "Total (INR)", "Paid (INR)", "Balance (INR)"],
        rows.map((i) => [
          i.number,
          i.customer?.name,
          invoiceStatus[invoiceDisplayStatus(i.status, i.due_date)].label,
          i.invoice_date,
          i.due_date,
          i.period_start,
          i.period_end,
          amount(i.total),
          amount(i.amount_paid),
          amount(Number(i.total) - Number(i.amount_paid)),
        ]),
      ),
    };
  }

  const m = params.get("method") as PaymentMethod;
  const method = paymentMethods.includes(m) ? m : undefined;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const rows = await all((page) =>
    listPayments({ page, pageSize: batch, search, method, from: isDate(from) ? from : undefined, to: isDate(to) ? to : undefined }),
  );
  return {
    filename: `payments-${stamp}.csv`,
    csv: toCsv(
      ["Received", "Invoice", "Customer", "Method", "Reference", "Note", "Recorded by", "Amount (INR)"],
      rows.map((p) => [
        p.paid_on,
        p.invoice?.number,
        p.customer?.name,
        methodLabel[p.method],
        p.reference,
        p.note,
        p.recordedBy ?? (p.method === "online" ? "Customer, online" : ""),
        amount(p.amount),
      ]),
    ),
  };
}
