# Hackathon Plan

How this build runs. Read it before writing code; where it disagrees with a
habit or a tool default, this document wins. The other files in `docs/` are
the working state: what exists, what is being built, and what is next.

---

## 1. At a glance

| | |
|---|---|
| Problem statement | Subscription Management System (`materials/`, kept out of git) |
| Working name | **Brightloop**: plans, subscriptions and recurring billing in one place |
| Repository | https://github.com/Kukyos/SubManagementSystem |
| Live URL | https://managesubs.vercel.app (tracks `main`). **What is live is what is submitted.** |
| Stack | Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres, Auth, RLS, pg_cron) · Vercel |

### The problem, in our own words

Brightloop sells software on subscription: monthly and yearly plans, add-ons
customers switch on and off, products that come in variants. Today the
subscriptions live in a spreadsheet, renewals are remembered by whoever
notices, invoices are typed by hand and payments are matched by scrolling bank
statements. Nobody can say what the recurring revenue actually is.

We are building the one system that runs that whole month. An admin sets up
products, variants, plans, taxes and discounts. Staff turn quotation templates
into subscriptions and walk each one from Draft through Quotation, Confirmed
and Active to Closed. On billing day every due subscription invoices itself,
with taxes and live discounts already applied and no period billed twice or
skipped. Payments are recorded against invoices, by staff or by the customer
paying online from their own portal, and the finance view shows active
subscriptions, MRR, collections and overdue invoices in one place, fast with
thousands of rows.

Three kinds of user: **Admin** (everything, the only one who adds staff or
changes the catalogue, taxes and discounts), **Staff** (customers,
subscriptions, invoices, payments), **Customer** (their own subscriptions and
invoices through the portal, and nothing else).

---

## 2. Lanes

Two people. Lanes keep parallel work from colliding.

| Lane | Owns |
|---|---|
| **Builder** | Architecture, `supabase/` (schema, RLS, functions), `src/services/`, `src/lib/`, routing and layouts, every page's first version, merges to `main`, deploy health |
| **Polisher** | Small, contained improvements inside pages that already exist: password strength meter, microcopy, empty / loading / error states, focus and keyboard order, responsive fixes, small animations. Claimed row by row in `TASKS.md` |

**Core rule: nobody edits outside their lane without asking.** The Polisher
does not change the schema, services, shared UI primitives or routing; if a
polish task needs one of those, it goes in `TASKS.md` as a request for the
Builder.

---

## 3. Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Supabase ·
Vercel.

- **Next 16 renamed middleware to `proxy.ts`.** Session refresh and the
  signed-out redirect live in `src/proxy.ts`. The framework's own docs ship in
  `node_modules/next/dist/docs/` and are the reference for anything that
  changed recently.
- **Cache Components is off.** Nearly every screen reads the session, and
  dynamic rendering with indexed queries meets the speed target without a
  Suspense boundary around every cookie read.
- **Tailwind v4 is configured in CSS** (`@theme` in `src/app/globals.css`).
  There is no `tailwind.config.js`.
- **Business rules live in Postgres.** Status transitions, the
  one-invoice-per-period guard, payment roll-up and the billing run are
  triggers and functions in `supabase/migrations/`. The app calls them and
  never re-implements them.
- **Adding a dependency is a decision, not a reflex.** Check bundle size first.
  Charts, PDF and email each get one library, chosen once, recorded in
  `PROGRESS.md`.

---

## 4. Repo shape

```
src/
  app/
    (public)/           landing, login, signup, password reset
    (app)/              staff and admin screens, behind auth
    portal/             customer portal, behind auth
  components/ui/        shared primitives       ← Builder
  components/layout/    shells, nav             ← Builder
  services/             ALL data access         ← Builder
  lib/supabase/         clients (server, browser, service role)
  lib/                  pure helpers (money, dates, validation)
  proxy.ts              session refresh + signed-out redirect
supabase/migrations/    schema, RLS, functions  ← Builder
docs/
```

**Pages never query Supabase directly.** Pages call `src/services/`; services
call Supabase. If a service function does not exist, it is added to
`SERVICES.md` first.

**The service-role key never reaches the browser.** It is used in exactly two
places: creating staff accounts and recording gateway-verified payments, both
after a server-side role check.

---

## 5. Git

- `main` is production. The Builder merges to it.
- The Polisher works on `polish/<topic>` branches, pushes freely, and the
  branch is merged to `main` **with a merge commit, not a squash**, so the
  history shows who did the work. Merge small and often.
- **Push at least once an hour, from everyone.** Work in progress goes on a
  branch; it still gets pushed.
- **One thing per commit.** One page, one fix, one migration, pushed when it
  is done. Don't split one change into several commits pushed in the same
  minute. Until work is pushed, its rows in `TASKS.md` say 📦 incoming so
  nobody starts on the same files.
- Commit messages are short and plain, the way you'd say it to a teammate:
  "products page with variant editor", "fix rounding on subscription
  discounts". Code comments only where the why isn't obvious.
- `git pull` before starting anything, and again after every merge to `main`.
- Claim a row in `TASKS.md` and push the claim before starting it.
- A merge that breaks production is **reverted first, debugged after**.
- Deleting or moving a file gets a line in `PROGRESS.md`, not just a commit.
- No tool-generated trailers or footers of any kind in commits or PR bodies.
- Authorship is honest: no `--author` overrides, no backdated commits.

---

## 6. Environment

Copy `.env.example` to `.env.local` and fill it in. `npm run dev` runs the app
against the shared Supabase project.

- Schema changes are new files in `supabase/migrations/`, applied to the
  project, never edited after they have been applied.
- Demo accounts (admin, staff, customer) are in the seed and listed in the
  README. Log in for real; never fake a user object to get past a guard.
- Vercel production env vars mirror `.env.example`. `NEXT_PUBLIC_SITE_URL`
  must be the production URL there, or password-reset links point at
  localhost.

---

## 7. Docs

| file | purpose |
|---|---|
| `TASKS.md` | Tiered task list, claimed by lane, ticked in the same push as the work |
| `FEATURES.md` | Every requirement in the brief, mapped to where it is built, plus what we add beyond it |
| `SCHEMA.md` | Tables, columns, rules. Source of truth for the data model |
| `SERVICES.md` | Every function pages may call. The page ↔ data contract |
| `AUTH.md` | Roles, what each can see and do, sign-up / reset / staff creation flows |
| `DESIGN.md` | Colour, type, spacing tokens and do's and don'ts |
| `PROGRESS.md` | Running log of what shipped, decisions taken, files moved |
| `IMPROVEMENTS.md` | What could be better: known gaps, polish ideas, lessons |

**If a column is not in `SCHEMA.md` or a function is not in `SERVICES.md`,
stop and ask.** Do not invent either.

`TASKS.md` changes in the same commit as the code it describes.

---

## 8. Build order

1. **Scaffold and contract.** App skeleton, Supabase clients, proxy, schema
   and RLS migrations, docs. Deployed to Vercel from the first page.
2. **Data and rules first.** Migrations applied, seed with realistic data at
   volume (thousands of subscriptions with invoices and payments), billing run
   and access rules tested in SQL. Runs while the visual direction is chosen.
3. **Design lands.** `DESIGN.md` filled from the chosen theme, tokens live in
   `globals.css`, fonts loaded and checked in a real browser. Landing and
   login built first and iterated until they look right; everything after
   inherits them.
4. **Every screen, one per commit.** Each commit carries the page, its
   services wiring and its loading, empty and error states. Tier order from
   `TASKS.md`.
5. **Polish in parallel.** As pages land, the Polisher takes rows from the
   polish section of `TASKS.md` on `polish/*` branches.
6. **Showcase.** Seeded demo, README with screenshots, fresh-browser test of
   the production URL, zero console errors.

---

## 9. Scope

The brief is the floor. Tiers order the work; they do not cap it.

- **Tier 1:** the demo dies without these. Auth with the brief's password
  rules, roles, catalogue, plans, the subscription lifecycle, invoices,
  payments.
- **Tier 2:** what makes it a product. Quotation templates, taxes, discounts
  that apply themselves, the scheduled billing run, finance dashboard,
  customer portal with online payment.
- **Tier 3:** what makes it memorable. Invoice PDF and email, overdue
  reminders, MRR / churn / forecast charts, activity timeline, global search,
  CSV export, dark mode.

**Seed data is Tier 1.** Lists, search and the dashboard are undemoable
against empty tables, and the two-second target means nothing without volume.

---

## 10. Definition of done, per page

Uses services (no direct queries) · uses shared UI primitives · `npm run lint`
and `npm run build` pass · matches `DESIGN.md` in a real browser · loading,
empty and error states · works at mobile width · keyboard reachable ·
respects `prefers-reduced-motion` · no console errors · responds in under two
seconds against the full seed · `TASKS.md` ticked in the same push.

---

## 11. Shared files

| file | why it collides | owner |
|---|---|---|
| `package.json` + lock | two people adding dependencies | Builder; ask before adding one |
| `src/app/globals.css` | one stylesheet | Builder; tokens only, pages use Tailwind classes |
| `src/components/ui/*`, `layout/*` | everyone imports them | Builder |
| `src/services/*`, `supabase/*` | the data contract | Builder |
| `docs/TASKS.md` | everyone, every commit | everyone; tick only your own rows |
| `docs/SCHEMA.md`, `docs/SERVICES.md` | read by everyone | Builder |
| `docs/DESIGN.md` | tokens everyone consumes | Builder |

---

## 12. Lessons carried over

- **A doc that describes the app is not the app.** Anything a doc claims gets
  checked against the running app.
- **Verification takes longer than building.** Budget for it; decide early
  which checks need a human at a visible browser.
- **Never judge animation speed from an automated browser.** A background tab
  gets no `requestAnimationFrame`; screenshots catch frozen frames.
- **Scope descendant selectors in shared CSS.** Default to `>`.
- **A negative assertion needs a positive sibling.** "X is absent" passes
  forever once X is deleted.
- **Access rules look right and silently are not.** Every RLS rule is tested
  as each role, both the allowed and the refused case.
- **An auth wall hides unfinished screens.** Seed demo accounts early so every
  screen behind login can be reviewed.
- **Type and colour are the cheapest high-leverage visual work.** Fonts and
  tokens go in first; component libraries late, if at all.
- **A one-accent palette cannot carry five chart series.** Encode by
  magnitude, label directly, keep 3:1 contrast.

---

## 13. Open items

- ⬜ Supabase GitHub integration: confirm it is not auto-deploying
  `supabase/` from this repo (migrations are applied directly).
- ⬜ Supabase Auth: minimum password length 9, require lower, upper and symbol.
- ✅ Supabase Auth: custom SMTP (Gmail) so reset links reach any address.
- ⬜ Vercel project linked, production tracking `main`, env vars set.
- ⬜ Razorpay test keys.
- ⬜ Visual direction chosen; `DESIGN.md` filled.
