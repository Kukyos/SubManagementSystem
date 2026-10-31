import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Products" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Catalogue" title="Products" description="What Brightloop sells, with variants and prices." />
      <EmptyState title="Not built yet" body="Tracked as T1.4 in docs/TASKS.md." />
    </>
  );
}
