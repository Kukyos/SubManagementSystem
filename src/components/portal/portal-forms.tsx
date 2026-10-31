"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { Notice } from "@/components/auth/forms";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { money } from "@/lib/format";
import { createGatewayOrder, verifyGatewayPayment } from "@/services/gateway-actions";
import { subscribe, updateMyProfile } from "@/services/portal-actions";
import type { Customer, ProductVariant } from "@/types/models";

export function SubscribeForm({
  planId,
  price,
  minQuantity,
  taxRate,
  variants,
  per,
}: {
  planId: string;
  price: number;
  minQuantity: number;
  taxRate: number;
  variants: ProductVariant[];
  per: string;
}) {
  const [state, action, pending] = useActionState(subscribe, null);
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState(minQuantity);
  const extra = Number(variants.find((v) => v.id === variantId)?.extra_price ?? 0);
  const subtotal = (price + extra) * (Number.isFinite(qty) && qty > 0 ? qty : 0);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="planId" value={planId} />
      {state && !state.ok && <Notice>{state.error}</Notice>}
      <div className="grid grid-cols-[1fr_5.5rem] gap-3">
        {variants.length > 0 ? (
          <Field label="Edition" htmlFor={`variant-${planId}`}>
            <Select id={`variant-${planId}`} name="variantId" value={variantId} onChange={(e) => setVariantId(e.target.value)} className="h-9">
              <option value="">Standard</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.attribute}: {v.value} (+{money(v.extra_price)})
                </option>
              ))}
            </Select>
          </Field>
        ) : (
          <span />
        )}
        <Field label={minQuantity > 1 ? `Seats (min ${minQuantity})` : "Seats"} htmlFor={`qty-${planId}`}>
          <Input
            id={`qty-${planId}`}
            name="quantity"
            type="number"
            min={minQuantity}
            max={500}
            step={1}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="tabular h-9"
          />
        </Field>
      </div>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">
          <span className="tabular text-sm text-fg">{money(subtotal * (1 + taxRate / 100))}</span> {per}, incl. {taxRate}% GST
        </p>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Subscribing…" : "Subscribe"}
        </Button>
      </div>
    </form>
  );
}

export function ProfileForm({ customer }: { customer: Customer }) {
  const [state, action, pending] = useActionState(updateMyProfile, null);
  const v = state?.values;

  return (
    <form action={action} className="space-y-5 p-5">
      {state && !state.ok && <Notice>{state.error}</Notice>}
      {state?.ok && (
        <p role="status" className="text-sm text-teal">
          Saved. New invoices use these details.
        </p>
      )}
      <fieldset key={JSON.stringify(v)} disabled={pending} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" required autoComplete="name" defaultValue={v?.name ?? customer.name} />
          </Field>
          <Field label="Email" htmlFor="email" hint="Your sign-in. Ask us to change it.">
            <Input id="email" value={customer.email} readOnly disabled />
          </Field>
          <Field label="Phone" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={v?.phone ?? customer.phone ?? ""} placeholder="+91 98400 12345" />
          </Field>
          <Field label="Company" htmlFor="company">
            <Input id="company" name="company" autoComplete="organization" defaultValue={v?.company ?? customer.company ?? ""} />
          </Field>
          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" autoComplete="street-address" defaultValue={v?.address ?? customer.address ?? ""} />
          </Field>
          <Field label="City" htmlFor="city">
            <Input id="city" name="city" autoComplete="address-level2" defaultValue={v?.city ?? customer.city ?? ""} />
          </Field>
          <Field label="GSTIN" htmlFor="taxNumber" hint="Printed on your invoices. Optional.">
            <Input id="taxNumber" name="taxNumber" maxLength={15} className="uppercase" defaultValue={v?.taxNumber ?? customer.tax_number ?? ""} placeholder="33ABCDE1234F1Z5" />
          </Field>
        </div>
      </fieldset>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayCheckout = { open(): void; on(event: "payment.failed", cb: (r: { error: { description?: string } }) => void): void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function PayNowButton({ invoiceId, amount }: { invoiceId: string; amount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"" | "opening" | "verifying">("");
  const [error, setError] = useState("");
  const [paid, setPaid] = useState(0);

  async function pay() {
    setError("");
    setBusy("opening");
    const [loaded, order] = await Promise.all([loadCheckout(), createGatewayOrder(invoiceId)]);
    if (!order.ok) return (setBusy(""), setError(order.error));
    if (!loaded || !window.Razorpay) return (setBusy(""), setError("The payment window didn't load. Check your connection and try again."));

    const o = order.data;
    const checkout = new window.Razorpay({
      key: o.keyId,
      order_id: o.orderId,
      amount: o.amount,
      currency: o.currency,
      name: "Brightloop Software",
      description: `Invoice ${o.invoiceNumber}`,
      prefill: { name: o.name, email: o.email },
      notes: { invoice: o.invoiceNumber },
      theme: { color: "#8052ff" },
      modal: { ondismiss: () => setBusy("") },
      handler: async (r: RazorpayResponse) => {
        setBusy("verifying");
        const res = await verifyGatewayPayment({
          invoiceId,
          orderId: r.razorpay_order_id,
          paymentId: r.razorpay_payment_id,
          signature: r.razorpay_signature,
        });
        setBusy("");
        if (!res.ok) return setError(res.error);
        setPaid(res.data.amount);
        router.refresh();
      },
    });
    checkout.on("payment.failed", (r) => setError(r.error.description || "The payment was declined. Nothing was charged."));
    checkout.open();
  }

  if (paid) {
    return (
      <p role="status" className="mt-4 rounded-field border border-teal/30 bg-teal/[0.06] px-3.5 py-3 text-sm text-teal">
        Payment of {money(paid)} received. Thank you.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {error && <Notice>{error}</Notice>}
      <Button type="button" onClick={pay} disabled={!!busy} className="w-full">
        {busy === "opening" ? "Opening checkout…" : busy === "verifying" ? "Confirming payment…" : `Pay ${money(amount)} now`}
      </Button>
      <p className="text-xs text-faint">Card, UPI or netbanking through Razorpay. You can also pay by bank transfer quoting the invoice number.</p>
    </div>
  );
}
