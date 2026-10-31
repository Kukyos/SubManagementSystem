import type { InvoiceStatus, PaymentMethod, SubscriptionStatus } from "@/types/models";

// One label and colour per status, used by badges, board columns, charts and shards.
type StatusStyle = { label: string; text: string; dot: string; hex: string };

export const subscriptionStatus: Record<SubscriptionStatus, StatusStyle> = {
  draft: { label: "Draft", text: "text-white/60", dot: "bg-white/50", hex: "#8a8a8f" },
  quotation: { label: "Quotation", text: "text-blue", dot: "bg-blue", hex: "#5b8cff" },
  confirmed: { label: "Confirmed", text: "text-accent-hover", dot: "bg-accent", hex: "#8052ff" },
  active: { label: "Active", text: "text-teal", dot: "bg-teal", hex: "#2fd3a7" },
  paused: { label: "Paused", text: "text-amber", dot: "bg-amber", hex: "#ffb829" },
  closed: { label: "Closed", text: "text-white/40", dot: "bg-white/25", hex: "#4a4a4f" },
};

export type InvoiceDisplayStatus = InvoiceStatus | "overdue";

export const invoiceStatus: Record<InvoiceDisplayStatus, StatusStyle> = {
  draft: { label: "Draft", text: "text-white/60", dot: "bg-white/50", hex: "#8a8a8f" },
  confirmed: { label: "Confirmed", text: "text-accent-hover", dot: "bg-accent", hex: "#8052ff" },
  paid: { label: "Paid", text: "text-teal", dot: "bg-teal", hex: "#2fd3a7" },
  cancelled: { label: "Cancelled", text: "text-white/40", dot: "bg-white/25", hex: "#4a4a4f" },
  overdue: { label: "Overdue", text: "text-pink", dot: "bg-pink", hex: "#ff7a9c" },
};

// Overdue isn't stored: it's a confirmed invoice past its due date.
export function invoiceDisplayStatus(status: InvoiceStatus, dueDate: string): InvoiceDisplayStatus {
  if (status === "confirmed" && dueDate < new Date().toISOString().slice(0, 10)) return "overdue";
  return status;
}

// Shard palette, in order. Plans and chart series take colours from here.
export const shardPalette = ["#ffb829", "#8052ff", "#2fd3a7", "#edebff", "#ff7a9c", "#5b8cff"];

export const methodLabel: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  upi: "UPI",
  card: "Card",
  cheque: "Cheque",
  cash: "Cash",
  online: "Online",
};
