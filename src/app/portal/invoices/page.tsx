import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Invoices" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Your account" title="Invoices" description="Every invoice we've sent you, and what's left to pay." />
      <EmptyState title="Not built yet" body="Tracked as T2.6 in docs/TASKS.md." />
    </>
  );
}
