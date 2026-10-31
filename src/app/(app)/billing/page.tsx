import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Billing run" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Billing" title="Billing run" description="Invoice every subscription that is due, and see what each run did." />
      <EmptyState title="Not built yet" body="Tracked as T2.4 in docs/TASKS.md." />
    </>
  );
}
