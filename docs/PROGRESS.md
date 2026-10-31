# Progress

Newest first. What shipped, decisions taken, and anything moved or deleted.

## 2026-10-31

### Where things stand (read this first in a new session)

- **Live:** the landing page at https://managesubs.vercel.app. `Sign in` and
  `Get started` point at `/login` and `/signup`, which are the next pages to
  build (T1.2) and 404 until then.
- **Built and ready to use:**
  - design tokens in `src/app/globals.css`
  - UI primitives in `src/components/ui/`: `Button`, `ButtonLink`,
    `SubscriptionBadge`, `InvoiceBadge`, `Card`, `Stat`, `Field`, `Input`,
    `Select`, `Textarea`, `PageHeader`, `EmptyState`
  - logo, status colours (`src/lib/status.ts`), money and date formatting
    (`src/lib/format.ts`)
  - typed Supabase clients and generated DB types (`src/types/database.ts`,
    aliases in `models.ts`)
  - `getCurrentUser` / `requireRole` / `signOut`
- **Shells:** console (`src/app/(app)/`, admin and staff) and portal
  (`src/app/portal/`, customers) both check the role on the server. Every
  screen has a stub page. Building a screen means replacing its stub and
  adding its service.
- **Database:** live and tested (see below). It is empty: no seed data and no
  users yet (S7).
- **Waiting on the user:** a Gmail address and app password for SMTP (S6),
  and Razorpay test keys (T2.8). `SUPABASE_SECRET_KEY` is needed locally and on
  Vercel before staff creation (T1.11) works.

### Log

- Landing page: a three.js field of ~2,600 wireframe tetrahedra (1,100 on
  small screens). They hold a loop in the hero, scatter over the "billing
  month today" lines, and re-form for the features. Section poses come from
  `data-shards` attributes. The scene pauses in background tabs and stays
  still under reduced motion. three.js is imported inside the effect, so it
  stays out of the first bundle.
- **Decision: Geist instead of PP Neue Montreal** (the reference's font is
  paid). Same sizes and weights.
- Supabase advisor reports nine `security definer` functions callable by
  signed-in users. All are intentional: each checks the caller's role itself.
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
