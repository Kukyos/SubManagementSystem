import Link from "next/link";
import { notFound } from "next/navigation";
import { DiscountForm } from "@/components/catalogue/discount-form";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/services/auth";
import { getDiscount, listProductOptions, uuid } from "@/services/catalogue";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return { title: "New discount" };
  const discount = uuid.test(id) ? await getDiscount(id) : null;
  return { title: discount?.name ?? "Discount" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const user = isNew ? await requireRole("admin") : await requireRole("admin", "staff");
  if (!isNew && !uuid.test(id)) notFound();

  const [discount, products] = await Promise.all([isNew ? null : getDiscount(id), listProductOptions()]);
  if (!isNew && !discount) notFound();
  const isAdmin = user.role === "admin";

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/discounts" className="text-muted hover:text-fg">
          ← Discounts
        </Link>
      </p>
      <PageHeader
        eyebrow="Catalogue"
        title={discount?.name ?? "New discount"}
        description={
          discount
            ? `Applied to ${discount.times_used} invoice${discount.times_used === 1 ? "" : "s"} so far.${isAdmin ? "" : " Only an admin can change discounts."}`
            : "Billing picks the best live discount for each line by itself."
        }
      />
      <Card className="max-w-3xl">
        <CardHeader title="Discount" />
        <DiscountForm discount={discount} products={products} readOnly={!isAdmin} />
      </Card>
    </>
  );
}
