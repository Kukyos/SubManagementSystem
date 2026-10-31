import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Discounts" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Discounts" description="Discount rules that apply themselves to the next invoice." />
      <EmptyState title="Not built yet" body="Tracked as T2.3 in docs/TASKS.md." />
    </>
  );
}
