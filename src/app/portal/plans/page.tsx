import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Plans" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Your account" title="Plans" description="Plans you can subscribe to." />
      <EmptyState title="Not built yet" body="Tracked as T2.7 in docs/TASKS.md." />
    </>
  );
}
