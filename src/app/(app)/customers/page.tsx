import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Customers" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Sales" title="Customers" description="Billing contacts, their subscriptions, invoices and balance." />
      <EmptyState title="Not built yet" body="Tracked as T1.6 in docs/TASKS.md." />
    </>
  );
}
