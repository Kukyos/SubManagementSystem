# Tasks

Claim a row by putting your lane in **Owner** and pushing before you start.
Tick it in the same push as the work. Tick only your own rows.

Lanes: **B** = Builder, **P** = Polisher.

Status: ⬜ todo · 🔨 in progress · 📦 incoming · ✅ done.

**📦 incoming** means the work is finished on someone's machine but not
pushed yet. It lands over the next pushes. Leave those files alone until the
row turns ✅. Pull first, then start. If you need to touch an incoming page,
add a row to Requests instead of editing it.

## Setup

| # | Task | Owner | Status |
|---|---|---|---|
| S1 | Next.js scaffold, Supabase clients, session proxy | B | ✅ |
| S2 | Schema + lifecycle triggers migration | B | ✅ |
| S3 | RLS, grants, billing run, finance summary, portal functions migration | B | ✅ |
| S4 | Docs set (`docs/`) | B | ✅ |
| S5 | Vercel project linked, env vars, first deploy | B | ✅ |
| S6 | Supabase Auth settings: password policy, custom SMTP, redirect URLs | B | ⬜ |
| S7 | Seed: catalogue, demo accounts, thousands of subscriptions with history | B | ⬜ |
| S8 | SQL checks: lifecycle, double billing, discounts, RLS per role | B | 🔨 billing rules pass; RLS per role after seed |
| S9 | `DESIGN.md` from chosen theme; tokens + fonts live | B | ✅ |

## Tier 1: the demo dies without these

| # | Task | Owner | Status |
|---|---|---|---|
| T1.1 | Landing page (shard loop scene) | B | ✅ |
| T1.2 | Sign up, sign in, forgot / reset password | B | ⬜ |
| T1.3 | App shell: sidebar, header, role-aware nav, sign out | B | ✅ (every route stubbed) |
| T1.4 | Products list + editor with variants | B | ⬜ |
| T1.5 | Plans list + editor | B | ⬜ |
| T1.6 | Customers list + detail | B | ⬜ |
| T1.7 | Subscriptions list (filters, status pipeline) | B | ⬜ |
| T1.8 | Subscription editor + detail: lines, status actions, timeline | B | ⬜ |
| T1.9 | Invoices list + detail: confirm, cancel, print | B | ⬜ |
| T1.10 | Record payment | B | ⬜ |
| T1.11 | Team page: admin adds staff | B | ⬜ |

## Tier 2: what makes it a product

| # | Task | Owner | Status |
|---|---|---|---|
| T2.1 | Quotation templates + "new from template" | B | ⬜ |
| T2.2 | Taxes settings | B | ⬜ |
| T2.3 | Discounts list + editor, attach to subscriptions | B | ⬜ |
| T2.4 | Billing run page: run now, result report, history | B | ⬜ |
| T2.5 | Finance dashboard: KPIs, charts, date range | B | ⬜ |
| T2.6 | Customer portal: overview, subscriptions, invoices | B | ⬜ |
| T2.7 | Portal: subscribe to a plan | B | ⬜ |
| T2.8 | Portal: pay invoice online (Razorpay test) | B | ⬜ |
| T2.9 | Overdue view + payments list | B | ⬜ |

## Tier 3: what makes it memorable

| # | Task | Owner | Status |
|---|---|---|---|
| T3.1 | Invoice PDF + email send (Resend) | B | ⬜ |
| T3.2 | Overdue reminder emails | B | ⬜ |
| T3.3 | Revenue forecast | B | ⬜ |
| T3.4 | Global search (⌘K) | B | ⬜ |
| T3.5 | CSV export on lists | B | ⬜ |
| T3.6 | Light theme (the app is dark-first) | B | ⬜ |
| T3.7 | Showcase README with screenshots | B | ⬜ |

## Polish

Small, contained, inside existing pages. Rows get added as pages land.

| # | Task | Page | Owner | Status |
|---|---|---|---|---|
| P1 | Password strength meter (colour bar + checklist of the four rules) | Sign up, reset | P | ⬜ |
| P2 | Show / hide password toggle | Sign in, sign up, reset | P | ⬜ |
| P3 | Friendly empty states with a next action | All lists | P | ⬜ |
| P4 | Skeleton loaders matching each list's layout | All lists | P | ⬜ |
| P5 | Inline field errors with focus on first invalid field | All forms | P | ⬜ |
| P6 | Mobile pass: tables become cards under 640px | All lists | P | ⬜ |
| P7 | Mobile pass: hero type size, nav collapses to a menu button under 1024px, check the loop sits well behind text | Landing | P | ⬜ |
| P8 | Hover states: CTA arrow nudge, nav link underline that grows from the left | Landing | P | ⬜ |
| P9 | Lifecycle chips light up one after another when they scroll into view | Landing | P | ⬜ |
| P10 | "Who it's for" cards: hover lift and a small coloured shard per role | Landing | P | ⬜ |
| P11 | Favicon and social preview image from the logo mark (`src/app/icon.svg`, `opengraph-image`) | Landing | P | ⬜ |
| P12 | Lighthouse pass on the live URL: contrast, labels, LCP; check `prefers-reduced-motion` freezes the scene | Landing | P | ⬜ |

## Requests

Things one lane needs from the other. Add a row; the owner picks it up.

| From | Request | Status |
|---|---|---|
