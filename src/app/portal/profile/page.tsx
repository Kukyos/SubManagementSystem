import { EmptyState, PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Profile" };

export default function Page() {
  return (
    <>
      <PageHeader eyebrow="Your account" title="Profile" description="Your contact details and password." />
      <EmptyState title="Not built yet" body="Tracked as T2.6 in docs/TASKS.md." />
    </>
  );
}
