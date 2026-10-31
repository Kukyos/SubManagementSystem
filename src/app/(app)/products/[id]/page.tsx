import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductForm, VariantForm } from "@/components/catalogue/product-form";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { money } from "@/lib/format";
import { requireRole } from "@/services/auth";
import { getProduct, listTaxes, uuid } from "@/services/catalogue";
import { archiveProduct, deleteVariant } from "@/services/catalogue-actions";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id === "new") return { title: "New product" };
  const product = uuid.test(id) ? await getProduct(id) : null;
  return { title: product?.name ?? "Product" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const user = isNew ? await requireRole("admin") : await requireRole("admin", "staff");
  if (!isNew && !uuid.test(id)) notFound();

  const [product, taxes] = await Promise.all([isNew ? null : getProduct(id), listTaxes()]);
  if (!isNew && !product) notFound();
  const isAdmin = user.role === "admin";

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/products" className="text-muted hover:text-fg">
          ← Products
        </Link>
      </p>
      <PageHeader
        eyebrow="Catalogue"
        title={product?.name ?? "New product"}
        description={
          product && !product.is_active
            ? "Archived. It stays on existing subscriptions and invoices but can't be added to new ones."
            : !isAdmin && "Only an admin can change products."
        }
        actions={
          product &&
          isAdmin && (
            <form action={archiveProduct.bind(null, product.id, product.is_active)}>
              <Button variant={product.is_active ? "danger" : "secondary"} size="sm">
                {product.is_active ? "Archive" : "Restore"}
              </Button>
            </form>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Card>
          <CardHeader title="Details" />
          <ProductForm product={product} taxes={taxes} readOnly={!isAdmin} />
        </Card>

        {product && (
          <Card>
            <CardHeader title="Variants" action={<span className="text-xs text-faint">Price = base + extra</span>} />
            {product.variants.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">
                No variants. Add one when the product comes in editions, like Brand: Odoo at ₹560 extra.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {product.variants.map((variant) => (
                  <li key={variant.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="text-muted">{variant.attribute}:</span> {variant.value}
                    </span>
                    <span className="tabular text-muted">+{money(variant.extra_price)}</span>
                    <span className="tabular w-28 text-right">{money(Number(product.sales_price) + Number(variant.extra_price))}</span>
                    {isAdmin && (
                      <form action={deleteVariant.bind(null, variant.id, product.id)}>
                        <button className="text-xs text-faint hover:text-pink" aria-label={`Remove ${variant.attribute}: ${variant.value}`}>
                          Remove
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {isAdmin && <VariantForm productId={product.id} />}
          </Card>
        )}
      </div>
    </>
  );
}
