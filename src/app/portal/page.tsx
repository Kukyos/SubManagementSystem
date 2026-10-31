import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Overview" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Your account" title="Overview" description="Your subscriptions, open invoices and balance." />
      <EmptyState title="Not built yet" body="Tracked as T2.6 in docs/TASKS.md." />
    </>
  );
}
