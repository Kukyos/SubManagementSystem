import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Dashboard" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Overview" title="Dashboard" description="Active subscriptions, MRR, collections and overdue invoices at a glance." />
      <EmptyState title="Not built yet" body="Tracked as T2.5 in docs/TASKS.md." />
    </>
  );
}
