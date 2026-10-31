"use server";

import { createHmac, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/services/auth";
import { uuid } from "@/services/catalogue";

const API = "https://api.razorpay.com/v1";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type GatewayOrder = {
  orderId: string;
  amount: number;
  currency: "INR";
  keyId: string;
  invoiceNumber: string;
  name: string;
  email: string;
};

export type GatewayPayload = {
  invoiceId: string;
  orderId: string;
  paymentId: string;
  signature: string;
};

type RazorpayOrder = { id: string; amount: number; currency: string; notes?: { invoice_id?: string } };
type RazorpayPayment = { id: string; order_id: string; amount: number; currency: string; status: string };

function keys() {
  const keyId = process.env.RAZORPAY_API_KEY;
  const secret = process.env.RAZORPAY_SECRET;
  return keyId && secret ? { keyId, secret } : null;
}

async function razorpay<T>(path: string, body?: object): Promise<T> {
  const k = keys()!;
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${k.keyId}:${k.secret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.description ?? `Razorpay returned ${res.status}`);
  return json as T;
}

async function customerOnly() {
  const user = await getCurrentUser();
  return user?.role === "customer" && user.customerId ? user : null;
}

// Read through the customer's own client, so RLS proves the invoice is theirs.
async function myOpenInvoice(invoiceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id, number, status, total, amount_paid")
    .eq("id", invoiceId)
    .maybeSingle();
  return data;
}

const paise = (rupees: number) => Math.round(rupees * 100);

export async function createGatewayOrder(invoiceId: string): Promise<Result<GatewayOrder>> {
  const user = await customerOnly();
  if (!user) return { ok: false, error: "Sign in with your customer account to pay." };
  const k = keys();
  if (!k) return { ok: false, error: "Online payment isn't set up yet. Pay by bank transfer or UPI for now." };
  if (!uuid.test(invoiceId)) return { ok: false, error: "That invoice doesn't exist." };

  const inv = await myOpenInvoice(invoiceId);
  if (!inv) return { ok: false, error: "That invoice doesn't exist." };
  if (inv.status !== "confirmed") return { ok: false, error: "This invoice has nothing left to pay." };
  const amount = paise(Number(inv.total) - Number(inv.amount_paid));
  if (amount < 100) return { ok: false, error: "This invoice has nothing left to pay." };

  try {
    const order = await razorpay<RazorpayOrder>("/orders", {
      amount,
      currency: "INR",
      receipt: inv.number,
      notes: { invoice_id: inv.id, invoice_number: inv.number },
    });
    return {
      ok: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: "INR",
        keyId: k.keyId,
        invoiceNumber: inv.number,
        name: user.fullName ?? "",
        email: user.email,
      },
    };
  } catch {
    return { ok: false, error: "We couldn't reach the payment provider. Try again in a moment." };
  }
}

function signatureMatches(orderId: string, paymentId: string, signature: string, secret: string) {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

// The browser only reports what happened; the amount and invoice come from
// Razorpay itself, and the row is written only once the signature checks out.
export async function verifyGatewayPayment(payload: GatewayPayload): Promise<Result<{ amount: number }>> {
  const user = await customerOnly();
  if (!user) return { ok: false, error: "Sign in with your customer account to pay." };
  const k = keys();
  if (!k) return { ok: false, error: "Online payment isn't set up yet." };
  const { invoiceId, orderId, paymentId, signature } = payload ?? {};
  if (!uuid.test(invoiceId) || !orderId || !paymentId || !signature) return { ok: false, error: "The payment details were incomplete." };
  if (!signatureMatches(orderId, paymentId, signature, k.secret)) {
    return { ok: false, error: "We couldn't verify this payment. If money left your account, contact us quoting " + paymentId + "." };
  }

  const keep = `Your payment ${paymentId} went through, but we couldn't record it just now. Contact us quoting it and we'll match it by hand.`;
  let payment: RazorpayPayment;
  try {
    const order = await razorpay<RazorpayOrder>(`/orders/${encodeURIComponent(orderId)}`);
    if (order.notes?.invoice_id !== invoiceId) return { ok: false, error: "This payment belongs to a different invoice." };
    payment = await razorpay<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
    if (payment.order_id !== orderId) return { ok: false, error: "This payment belongs to a different order." };
    if (payment.status === "authorized") {
      payment = await razorpay<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}/capture`, {
        amount: payment.amount,
        currency: payment.currency,
      });
    }
    if (payment.status !== "captured") return { ok: false, error: "The payment didn't complete. Nothing was charged." };
  } catch {
    return { ok: false, error: keep };
  }

  if (!(await myOpenInvoice(invoiceId))) return { ok: false, error: "That invoice doesn't exist." };

  const amount = payment.amount / 100;
  const { error } = await createServiceClient().from("payments").insert({
    invoice_id: invoiceId,
    customer_id: user.customerId!,
    method: "online",
    amount,
    reference: paymentId,
    gateway_order_id: orderId,
    gateway_payment_id: paymentId,
    note: "Paid online through Razorpay",
    recorded_by: user.id,
  });
  // 23505: this payment id is already recorded (a double submit), which is fine.
  if (error && error.code !== "23505") return { ok: false, error: keep };

  for (const p of ["/portal", "/portal/invoices", `/portal/invoices/${invoiceId}`, "/payments", `/invoices/${invoiceId}`, "/dashboard"]) {
    revalidatePath(p);
  }
  return { ok: true, data: { amount } };
}
