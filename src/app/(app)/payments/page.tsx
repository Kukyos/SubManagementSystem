import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Payments" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Billing" title="Payments" description="Every payment recorded against an invoice." />
      <EmptyState title="Not built yet" body="Tracked as T2.9 in docs/TASKS.md." />
    </>
  );
}
