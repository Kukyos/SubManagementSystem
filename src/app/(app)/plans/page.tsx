import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Plans" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Plans" description="Price, billing period, minimum quantity and what each plan allows." />
      <EmptyState title="Not built yet" body="Tracked as T1.5 in docs/TASKS.md." />
    </>
  );
}
