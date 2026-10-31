import { money } from "@/lib/format";
import { invoiceStatus, subscriptionStatus } from "@/lib/status";
import type { TimelineEntry } from "@/services/subscriptions";

const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function label(entity: "subscriptions" | "invoices", status: string | null) {
  const map: Record<string, { label: string }> = entity === "subscriptions" ? subscriptionStatus : invoiceStatus;
  return status ? (map[status]?.label ?? status) : "";
}

// "bank_transfer payment of 4720.00 recorded" -> "Bank transfer payment of ₹4,720 recorded"
const paymentText = (m: string | null) =>
  (m ?? "Payment recorded")
    .replace("_", " ")
    .replace(/of ([\d.]+)/, (_, n) => `of ${money(Number(n))}`)
    .replace(/^./, (c) => c.toUpperCase());

export function Timeline({ entries, entity }: { entries: TimelineEntry[]; entity: "subscriptions" | "invoices" }) {
  if (!entries.length) return <p className="px-5 py-6 text-sm text-muted">Nothing has happened yet.</p>;
  const colours: Record<string, { hex: string }> = entity === "subscriptions" ? subscriptionStatus : invoiceStatus;

  return (
    <ol className="space-y-4 px-5 py-5">
      {entries.map((e) => {
        const text =
          e.action === "created"
            ? `Created as ${label(entity, e.to_status)}`
            : e.action === "payment"
              ? paymentText(e.message)
              : `${label(entity, e.from_status)} → ${label(entity, e.to_status)}`;
        const colour = e.action === "payment" ? "#2fd3a7" : (colours[e.to_status ?? ""]?.hex ?? "#8a8a8f");
        return (
          <li key={e.id} className="flex gap-3 text-sm">
            <span aria-hidden className="mt-1.5 size-2 shrink-0 [clip-path:polygon(50%_0,100%_100%,0_100%)]" style={{ background: colour }} />
            <span>
              {text}
              <span className="block text-xs text-faint">
                {when.format(new Date(e.created_at))}
                {e.actor && ` · ${e.actor}`}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
