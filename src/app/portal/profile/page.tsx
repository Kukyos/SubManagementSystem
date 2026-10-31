import { ProfileForm } from "@/components/portal/portal-forms";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/services/auth";
import { myOverview } from "@/services/portal";

export const metadata = { title: "Profile" };

export default async function Page() {
  await requireRole("customer");
  const { customer } = await myOverview();

  return (
    <>
      <PageHeader eyebrow="Your account" title="Profile" description="Your contact details and password." />
      {customer ? (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card>
            <CardHeader title="Billing details" />
            <ProfileForm customer={customer} />
          </Card>
          <Card>
            <CardHeader title="Password" />
            <div className="flex flex-col items-start gap-4 p-5 text-sm text-muted">
              <p>Choose a new password. You stay signed in on this device.</p>
              <ButtonLink href="/auth/reset" variant="secondary" size="sm">
                Change password
              </ButtonLink>
            </div>
          </Card>
        </div>
      ) : (
        <EmptyState title="We couldn't find your billing record" body="Write to us and we'll link it to your sign-in." />
      )}
    </>
  );
}
