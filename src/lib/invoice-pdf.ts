import "server-only";
import { LineCapStyle, PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { date } from "@/lib/format";
import { invoiceDisplayStatus, invoiceStatus } from "@/lib/status";
import type { InvoiceDetail } from "@/services/invoices";

// The standard PDF fonts only cover Windows-1252, so ₹ becomes "Rs." and
// anything else outside it is swapped for "?" instead of failing the whole file.
const safe = (s: string | null | undefined) =>
  (s ?? "").replace(/₹/g, "Rs. ").replace(/[−–—]/g, "-").replace(/[^\x20-\x7e\xa0-\xff‘’“”•…]/g, "?");

const num = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rs = (n: number | string) => "Rs. " + num.format(Number(n));

const ink = rgb(0.07, 0.07, 0.09);
const grey = rgb(0.42, 0.42, 0.46);
const line = rgb(0.86, 0.86, 0.88);
const violet = rgb(0.5, 0.32, 1);

// INV/2026/00042 → INV-2026-00042.pdf
export const pdfName = (number: string) => `${number.replace(/\//g, "-")}.pdf`;

export async function invoicePdf(inv: InvoiceDetail): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${inv.number}`);
  pdf.setAuthor("Brightloop Software Pvt. Ltd.");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28;
  const H = 841.89;
  const M = 48;
  let page = pdf.addPage([W, H]);
  let y = H - M;

  const text = (p: PDFPage, s: string, x: number, yy: number, o: { size?: number; font?: PDFFont; color?: typeof ink; align?: "left" | "right" } = {}) => {
    const size = o.size ?? 9.5;
    const font = o.font ?? regular;
    const str = safe(s);
    const w = font.widthOfTextAtSize(str, size);
    p.drawText(str, { x: o.align === "right" ? x - w : x, y: yy, size, font, color: o.color ?? ink });
  };
  // Long descriptions wrap inside their column.
  const wrap = (s: string, width: number, size = 9.5) => {
    const words = safe(s).split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (regular.widthOfTextAtSize(next, size) > width && cur) {
        lines.push(cur);
        cur = w;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  };

  // Header: the logo mark (same paths as components/brand/logo.tsx), the name, the seller.
  const k = 0.85;
  const pt = (x: number, yy: number) => ({ x: M + x * k, y: y + 2 - yy * k });
  const edge = (a: [number, number], b: [number, number], color: ReturnType<typeof rgb>, opacity = 1) =>
    page.drawLine({ start: pt(...a), end: pt(...b), thickness: 1.4, color, opacity, lineCap: LineCapStyle.Round });
  edge([3, 22], [29, 22], rgb(0.93, 0.92, 1), 0.6);
  edge([16, 3], [3, 22], rgb(1, 0.72, 0.16));
  edge([3, 22], [18, 29], rgb(1, 0.72, 0.16));
  edge([16, 3], [29, 22], violet);
  edge([29, 22], [18, 29], violet);
  edge([16, 3], [18, 29], rgb(0.18, 0.83, 0.65));
  text(page, "Brightloop", M + 30, y - 16, { size: 15, font: bold });
  text(page, "Brightloop Software Pvt. Ltd.", M, y - 44, { size: 8.5, color: grey });
  text(page, "GSTIN 33AAKCB4821L1Z9", M, y - 56, { size: 8.5, color: grey });

  const display = invoiceDisplayStatus(inv.status, inv.due_date);
  text(page, "TAX INVOICE", W - M, y - 8, { size: 8.5, font: bold, color: grey, align: "right" });
  text(page, inv.number, W - M, y - 28, { size: 16, align: "right" });
  text(page, invoiceStatus[display].label, W - M, y - 44, { size: 9, color: display === "overdue" ? rgb(0.85, 0.2, 0.35) : grey, align: "right" });
  y -= 92;

  // Billed to, and the dates.
  text(page, "Billed to", M, y, { size: 8.5, color: grey });
  text(page, inv.customer.name, M, y - 15, { size: 10.5, font: bold });
  let by = y - 29;
  for (const l of wrap([inv.customer.company, inv.customer.address, inv.customer.city].filter(Boolean).join(", "), 240, 9)) {
    text(page, l, M, by, { size: 9, color: grey });
    by -= 12;
  }
  if (inv.customer.tax_number) {
    text(page, `GSTIN ${inv.customer.tax_number}`, M, by, { size: 9, color: grey });
    by -= 12;
  }
  text(page, inv.customer.email, M, by, { size: 9, color: grey });

  const facts: [string, string][] = [
    ["Invoice date", date(inv.invoice_date)],
    ["Due", date(inv.due_date)],
  ];
  if (inv.period_start) facts.push(["Period", `${date(inv.period_start)} - ${date(inv.period_end)}`]);
  if (inv.subscription) facts.push(["Subscription", inv.subscription.number], ["Plan", inv.subscription.plan]);
  facts.forEach(([label, v], i) => {
    text(page, label, W - M - 230, y - i * 15, { size: 9, color: grey });
    text(page, v, W - M, y - i * 15, { size: 9, align: "right" });
  });
  y = Math.min(by, y - facts.length * 15) - 30;

  // Lines.
  const cols = { item: M, qty: 318, unit: 386, disc: 446, tax: 496, amount: W - M };
  const head = (p: PDFPage, yy: number) => {
    text(p, "Item", cols.item, yy, { size: 8.5, color: grey });
    text(p, "Qty", cols.qty, yy, { size: 8.5, color: grey, align: "right" });
    text(p, "Unit", cols.unit, yy, { size: 8.5, color: grey, align: "right" });
    text(p, "Discount", cols.disc, yy, { size: 8.5, color: grey, align: "right" });
    text(p, "GST", cols.tax, yy, { size: 8.5, color: grey, align: "right" });
    text(p, "Amount", cols.amount, yy, { size: 8.5, color: grey, align: "right" });
    p.drawLine({ start: { x: M, y: yy - 7 }, end: { x: W - M, y: yy - 7 }, thickness: 0.6, color: line });
  };
  head(page, y);
  y -= 24;
  for (const l of inv.lines) {
    const desc = wrap(l.description, cols.qty - cols.item - 50);
    const rowH = Math.max(desc.length * 12, 22) + 10;
    if (y - rowH < M + 140) {
      page = pdf.addPage([W, H]);
      y = H - M;
      head(page, y);
      y -= 24;
    }
    desc.forEach((d, i) => text(page, d, cols.item, y - i * 12));
    text(page, String(Number(l.quantity)), cols.qty, y, { align: "right" });
    text(page, num.format(Number(l.unit_price)), cols.unit, y, { align: "right" });
    text(page, Number(l.discount_amount) > 0 ? `-${num.format(Number(l.discount_amount))}` : "-", cols.disc, y, { align: "right" });
    text(page, num.format(Number(l.tax_amount)), cols.tax, y, { align: "right" });
    text(page, `${Number(l.tax_rate)}%`, cols.tax, y - 11, { size: 7.5, color: grey, align: "right" });
    text(page, num.format(Number(l.total)), cols.amount, y, { align: "right" });
    y -= rowH;
    page.drawLine({ start: { x: M, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 0.4, color: line });
  }

  // Totals.
  y -= 8;
  const due = Math.round((Number(inv.total) - Number(inv.amount_paid)) * 100) / 100;
  const totals: [string, string, boolean?][] = [["Subtotal", rs(inv.subtotal)]];
  if (Number(inv.discount_total) > 0) totals.push([`Discount${inv.discount ? ` (${inv.discount})` : ""}`, `-${rs(inv.discount_total)}`]);
  totals.push(["GST", rs(inv.tax_total)]);
  totals.push(["Total", rs(inv.total), true]);
  if (Number(inv.amount_paid) > 0) {
    totals.push(["Paid", `-${rs(inv.amount_paid)}`]);
    totals.push(["Balance due", rs(due), true]);
  }
  for (const [k, v, strong] of totals) {
    if (strong) page.drawLine({ start: { x: W - M - 210, y: y + 12 }, end: { x: W - M, y: y + 12 }, thickness: 0.6, color: line });
    text(page, k, W - M - 210, y, { font: strong ? bold : regular, color: strong ? ink : grey });
    text(page, v, W - M, y, { font: strong ? bold : regular, size: strong ? 11 : 9.5, align: "right" });
    y -= strong ? 22 : 16;
  }

  y -= 10;
  if (inv.notes) {
    for (const l of wrap(inv.notes, W - 2 * M, 9)) {
      text(page, l, M, y, { size: 9, color: grey });
      y -= 12;
    }
  }
  const footer = inv.status === "paid" ? `Paid in full on ${date(inv.paid_at)}. Thank you.` : `Please pay by ${date(inv.due_date)}, quoting ${inv.number}.`;
  text(page, footer, M, M, { size: 8.5, color: grey });
  text(page, "All amounts in INR", W - M, M, { size: 8.5, color: grey, align: "right" });

  return pdf.save();
}
