import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Settings" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Settings" description="Taxes, team members and your profile." />
      <EmptyState title="Not built yet" body="Tracked as T1.11 · T2.2 in docs/TASKS.md." />
    </>
  );
}
