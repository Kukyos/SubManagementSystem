import { invoiceStatus, subscriptionStatus, type InvoiceDisplayStatus } from "@/lib/status";
import type { SubscriptionStatus } from "@/types/models";
import { cn } from "@/lib/format";

// Tiny triangle instead of a round dot: the shard motif at badge size.
function Shard({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block size-2 shrink-0 [clip-path:polygon(50%_0,100%_100%,0_100%)]", className)}
    />
  );
}

function Pill({ label, text, dot }: { label: string; text: string; dot: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.03] px-2.5 py-0.5 text-xs font-medium",
        text,
      )}
    >
      <Shard className={dot} />
      {label}
    </span>
  );
}

export function SubscriptionBadge({ status }: { status: SubscriptionStatus }) {
  return <Pill {...subscriptionStatus[status]} />;
}

export function InvoiceBadge({ status }: { status: InvoiceDisplayStatus }) {
  return <Pill {...invoiceStatus[status]} />;
}
