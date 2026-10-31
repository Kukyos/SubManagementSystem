import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Quotation templates" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Sales" title="Quotation templates" description="Ready-made offers with a plan, product lines and a validity period." />
      <EmptyState title="Not built yet" body="Tracked as T2.1 in docs/TASKS.md." />
    </>
  );
}
