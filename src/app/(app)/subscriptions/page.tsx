import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Subscriptions" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Sales" title="Subscriptions" description="Every subscription from draft to closed, as a table or a pipeline board." />
      <EmptyState title="Not built yet" body="Tracked as T1.7 in docs/TASKS.md." />
    </>
  );
}
