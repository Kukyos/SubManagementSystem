import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Invoices" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Billing" title="Invoices" description="Draft, confirmed, paid and overdue invoices." />
      <EmptyState title="Not built yet" body="Tracked as T1.9 in docs/TASKS.md." />
    </>
  );
}
