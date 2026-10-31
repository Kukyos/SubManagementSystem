import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanForm } from "@/components/catalogue/plan-form";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/services/auth";
import { getPlan, listProductOptions, uuid } from "@/services/catalogue";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return { title: "New plan" };
  const plan = uuid.test(id) ? await getPlan(id) : null;
  return { title: plan?.name ?? "Plan" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const user = isNew ? await requireRole("admin") : await requireRole("admin", "staff");
  if (!isNew && !uuid.test(id)) notFound();

  const plan = isNew ? null : await getPlan(id);
  if (!isNew && !plan) notFound();
  const products = await listProductOptions(plan?.product_id);
  const isAdmin = user.role === "admin";

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/plans" className="text-muted hover:text-fg">
          ← Plans
        </Link>
      </p>
      <PageHeader
        eyebrow="Catalogue"
        title={plan?.name ?? "New plan"}
        description={
          plan && !plan.is_active
            ? "Archived. Existing subscriptions keep billing on it; new ones can't pick it."
            : !isAdmin && "Only an admin can change plans."
        }
      />
      <Card className="max-w-3xl">
        <CardHeader title="Plan" />
        <PlanForm plan={plan} products={products} readOnly={!isAdmin} />
      </Card>
    </>
  );
}
