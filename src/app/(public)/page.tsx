import type { Metadata } from "next";
import { ShardField } from "@/components/landing/shard-field";
import { SiteFooter, SiteHeader } from "@/components/landing/site-header";
import { ButtonLink } from "@/components/ui/button";
import { subscriptionStatus } from "@/lib/status";
import type { SubscriptionStatus } from "@/types/models";

export const metadata: Metadata = {
  title: { absolute: "Brightloop · Recurring revenue that runs itself" },
};

const lifecycle: SubscriptionStatus[] = ["draft", "quotation", "confirmed", "active", "closed"];

const today = [
  "Subscriptions live in a spreadsheet. Renewals are remembered by whoever notices first.",
  "Invoices are typed by hand every month. Payments are matched by scrolling through bank statements.",
  "And at the end of the quarter, nobody can say how much recurring revenue the company actually has.",
];

const features = [
  {
    title: "Launch a plan in minutes",
    body: "Add the product with its variants (pick the Odoo brand, add ₹560), then the plan: price, daily to yearly billing, minimum seats, the dates it's on sale, and whether it can pause, close early or renew.",
  },
  {
    title: "From quote to subscription",
    body: "Start from a quotation template with the right plan and lines already in place. Every subscription gets its own number and moves through one clear lifecycle the whole team can see.",
    lifecycle: true,
  },
  {
    title: "Billing day runs itself",
    body: "Every due subscription turns into an invoice overnight, with customer details, lines, taxes and totals filled in. A period is never billed twice, and a missed one is never skipped.",
  },
  {
    title: "Discounts that remember themselves",
    body: "Fixed or percentage, on chosen products or a whole subscription, with minimums, dates and a usage limit. They land on the next invoice on their own and stop when they expire or run out.",
  },
  {
    title: "Money in, nothing missed",
    body: "Record payments by any method against the right invoice, or let customers pay online from their portal. Paid, outstanding and overdue are always one glance away.",
  },
  {
    title: "Numbers the finance lead trusts",
    body: "Active subscriptions, monthly recurring revenue, collections and overdue invoices on one screen, with filters, and fast with thousands of subscriptions on the books.",
  },
];

const roles = [
  {
    who: "Admins",
    line: "set the rules",
    body: "Products, variants, plans, taxes and discounts, plus who on the team gets access.",
  },
  {
    who: "Staff",
    line: "run the day",
    body: "Customers, quotations, subscriptions, invoices and payments, without touching the rules.",
  },
  {
    who: "Customers",
    line: "serve themselves",
    body: "Their own subscriptions and invoices in a portal: pay online, pause or cancel, no emails needed.",
  },
];

export default function LandingPage() {
  return (
    <>
      <ShardField />
      <SiteHeader />

      <main className="legible relative z-10">
        {/* Hero: the loop, intact */}
        <section data-shards="loop-right" className="mx-auto flex min-h-screen max-w-[1440px] items-center px-6 pt-24 md:px-10">
          <div className="max-w-2xl">
            <h1 className="text-display font-normal">
              <span className="rise block">Revenue</span>
              <span className="rise block [animation-delay:120ms]">that runs</span>
              <span className="rise block [animation-delay:240ms]">itself.</span>
            </h1>
            <p className="eyebrow rise mt-10 [animation-delay:420ms]">Stop chasing renewals. Start billing them.</p>
            <p className="rise mt-4 max-w-xl text-lead font-extralight [animation-delay:500ms]">
              Plans, subscriptions, invoices and payments in one place. Brightloop bills every customer on time,
              applies the right taxes and discounts, and tells you exactly how much recurring revenue you have.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3 [animation-delay:600ms]">
              <ButtonLink href="/signup" size="lg">
                Get started
              </ButtonLink>
              <ButtonLink href="/login" size="lg" variant="secondary">
                Sign in
              </ButtonLink>
            </div>
          </div>
        </section>

        {/* What the shards mean */}
        <section
          id="how-it-works"
          data-shards="loop-left"
          className="mx-auto flex min-h-[90vh] max-w-[1440px] items-center justify-end px-6 md:px-10"
        >
          <div className="reveal max-w-md">
            <p className="eyebrow">Look closer</p>
            <h2 className="mt-4 text-5xl font-normal leading-[1.08] tracking-[-0.03em] md:text-6xl">
              Every shard is a subscription.
            </h2>
            <p className="mt-6 text-lead font-extralight text-white/85">
              Coloured by its plan, bright while it&apos;s active, dim while it&apos;s paused. Together they make one
              loop, and that loop is your business.
            </p>
          </div>
        </section>

        {/* Today: the loop breaks apart */}
        <section data-shards="scatter" className="mx-auto max-w-5xl space-y-[38vh] px-6 py-[30vh] text-center">
          <p className="reveal text-statement">This is a billing month today.</p>
          {today.map((line) => (
            <p key={line} className="reveal text-statement">
              {line}
            </p>
          ))}
        </section>

        {/* And back together */}
        <section data-shards="loop" className="mx-auto flex min-h-screen max-w-4xl items-center px-6 text-center">
          <div className="reveal w-full">
            <p className="eyebrow">One place</p>
            <p className="mt-6 text-statement">
              Brightloop pulls every plan, subscription, invoice and payment back into one loop, and keeps it turning.
            </p>
          </div>
        </section>

        <section
          id="features"
          data-shards="loop-left"
          className="mx-auto grid max-w-[1440px] px-6 pb-[20vh] md:px-10 lg:grid-cols-2"
        >
          <div aria-hidden className="hidden lg:block" />
          <ol className="space-y-[18vh]">
            {features.map((f, i) => (
              <li key={f.title} className="reveal max-w-lg">
                <p className="eyebrow tabular">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-4xl font-normal leading-[1.1] tracking-[-0.02em]">{f.title}</h3>
                <p className="mt-5 text-lg font-extralight leading-relaxed text-white/85">{f.body}</p>
                {f.lifecycle && (
                  <ol className="mt-6 flex flex-wrap items-center gap-2" aria-label="Subscription lifecycle">
                    {lifecycle.map((s, n) => (
                      <li key={s} className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs font-medium">
                          <span
                            aria-hidden
                            className="size-2 [clip-path:polygon(50%_0,100%_100%,0_100%)]"
                            style={{ background: subscriptionStatus[s].hex }}
                          />
                          {subscriptionStatus[s].label}
                        </span>
                        {n < lifecycle.length - 1 && <span aria-hidden className="text-faint">→</span>}
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section id="who-its-for" data-shards="scatter" className="mx-auto max-w-[1440px] px-6 py-[20vh] md:px-10">
          <h2 className="reveal max-w-3xl text-5xl font-normal leading-[1.08] tracking-[-0.03em] md:text-6xl">
            Everyone sees what they need. Nobody sees more.
          </h2>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {roles.map((r) => (
              <div key={r.who} className="reveal rounded-card border border-line bg-black/60 p-8 backdrop-blur-md">
                <p className="text-2xl font-normal tracking-[-0.01em]">
                  {r.who} <span className="text-muted">{r.line}.</span>
                </p>
                <p className="mt-4 font-extralight leading-relaxed text-white/80">{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section data-shards="loop" className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h2 className="reveal text-display font-normal">Close the loop.</h2>
          <p className="reveal mt-6 max-w-lg text-lead font-extralight text-white/85">
            Set up your first plan today. Your first invoice can go out tonight.
          </p>
          <div className="reveal mt-10 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/signup" size="lg">
              Get started
            </ButtonLink>
            <ButtonLink href="/login" size="lg" variant="secondary">
              Sign in
            </ButtonLink>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
