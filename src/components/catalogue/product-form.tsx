"use client";

import { useActionState, useEffect, useRef } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveProduct, saveVariant } from "@/services/catalogue-actions";
import type { ProductDetail } from "@/services/catalogue";
import type { Tax } from "@/types/models";

export function ProductForm({ product, taxes, readOnly }: { product: ProductDetail | null; taxes: Tax[]; readOnly: boolean }) {
  const [state, action, pending] = useActionState(saveProduct, null);
  const v = state?.values;
  const defaultTax = taxes.find((t) => t.is_default)?.id ?? "";

  return (
    <form action={action} className="space-y-5 p-5">
      {product && <input type="hidden" name="id" value={product.id} />}
      {state && !state.ok && <Notice>{state.error}</Notice>}
      {state?.ok && (
        <p role="status" className="text-sm text-teal">
          Saved.
        </p>
      )}

      <fieldset disabled={readOnly || pending} className="space-y-5">
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required autoFocus={!product} defaultValue={v?.name ?? product?.name} placeholder="Odoo ERP licence" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type" htmlFor="type">
            <Select id="type" name="type" defaultValue={v?.type ?? product?.type ?? "service"}>
              <option value="service">Service</option>
              <option value="goods">Goods</option>
              <option value="addon">Add-on</option>
            </Select>
          </Field>
          <Field label="Tax" htmlFor="taxId" hint="Used on every line of this product unless the line picks its own.">
            <Select id="taxId" name="taxId" defaultValue={v?.taxId ?? (product ? (product.tax_id ?? "") : defaultTax)}>
              <option value="">No tax</option>
              {taxes.map((t) => (
                <option key={t.id} value={t.id} disabled={!t.is_active}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Sales price (₹)" htmlFor="salesPrice" hint="Before tax, per unit.">
            <Input id="salesPrice" name="salesPrice" type="number" min={0} step="0.01" required className="tabular" defaultValue={v?.salesPrice ?? product?.sales_price} />
          </Field>
          <Field label="Cost price (₹)" htmlFor="costPrice" hint="Internal. Customers never see it.">
            <Input id="costPrice" name="costPrice" type="number" min={0} step="0.01" className="tabular" defaultValue={v?.costPrice ?? product?.costPrice ?? ""} />
          </Field>
        </div>

        <Field label="Notes" htmlFor="notes">
          <Textarea id="notes" name="notes" defaultValue={v?.notes ?? product?.notes ?? ""} />
        </Field>
      </fieldset>

      {!readOnly && (
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : product ? "Save changes" : "Create product"}
        </Button>
      )}
    </form>
  );
}

export function VariantForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(saveVariant, null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      form.current?.reset();
      form.current?.querySelector<HTMLInputElement>("[name=attribute]")?.focus();
    }
  }, [state]);

  const v = state && !state.ok ? state.values : undefined;
  return (
    <form ref={form} action={action} className="space-y-3 border-t border-line p-5">
      <input type="hidden" name="productId" value={productId} />
      {state && !state.ok && <Notice>{state.error}</Notice>}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_7rem] sm:items-end">
        <Field label="Attribute" htmlFor="attribute">
          <Input id="attribute" name="attribute" required placeholder="Brand" defaultValue={v?.attribute} />
        </Field>
        <Field label="Value" htmlFor="value">
          <Input id="value" name="value" required placeholder="Odoo" defaultValue={v?.value} />
        </Field>
        <Field label="Extra (₹)" htmlFor="extraPrice">
          <Input id="extraPrice" name="extraPrice" type="number" min={0} step="0.01" className="tabular" placeholder="560" defaultValue={v?.extraPrice} />
        </Field>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "Adding…" : "Add variant"}
      </Button>
    </form>
  );
}
