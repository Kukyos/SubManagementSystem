# Progress

Newest first. What shipped, decisions taken, and anything moved or deleted.

## 2026-10-31

- Applied the three migrations to Supabase and renamed the files to the
  versions Supabase recorded, so the GitHub integration treats them as already
  applied.
- Checked the billing rules against the live database (in a rolled-back
  transaction): illegal transitions refused, missed periods caught up, re-run
  bills nothing twice, variant extra price, product discount stopping at its
  usage limit, GST on the discounted amount, partial then full payment
  flipping the invoice to paid, overpayment refused.
- Live at https://managesubs.vercel.app.
- Scaffolded Next.js 16 (App Router, TypeScript, Tailwind v4) with Supabase
  SSR clients and `src/proxy.ts` for session refresh and the signed-out
  redirect.
- **Decision: Cache Components off.** Almost every screen reads the session;
  dynamic rendering keeps the code simple and is fast enough with indexed,
  paginated queries.
- **Decision: business rules in Postgres.** Subscription and invoice
  lifecycles, the one-invoice-per-period guard, payment roll-up, discounts and
  the billing run are triggers and functions, so every path through the app
  (and pg_cron) gets them.
- **Decision: customers are separate from logins.** Staff can create a
  customer before that person ever signs up; sign-up links them by email.
- **Decision: cost price hidden from customers** with column-level grants;
  staff read it through `product_costs()`.
- Wrote the core schema and the access / billing migrations.
- Rewrote `HACKATHON_PLAN.md` for this build; added the docs set.
