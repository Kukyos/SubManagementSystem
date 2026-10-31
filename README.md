<p align="center">
  <img src="src/app/icon.svg" alt="Brightloop logo" width="96" height="96" />
</p>

<h1 align="center">Brightloop</h1>

<p align="center">
  Plans, subscriptions and recurring billing in one place.<br />
  <a href="https://managesubs.vercel.app"><b>managesubs.vercel.app</b></a>
</p>

<p align="center">
  Next.js 16 · TypeScript · Tailwind CSS v4 · Supabase · Vercel
</p>

---

Built for the Odoo hackathon problem statement *Subscription Management
System*. Brightloop Software sells everything on subscription; this is the
system that runs its billing month, from a new customer signing up to the
finance lead reading the numbers.

## Run it locally

Needs Node 20 or newer.

```bash
git clone https://github.com/Kukyos/SubManagementSystem.git
cd SubManagementSystem
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

Fill in `.env.local` before signing in:

| variable | what it is | needed for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | already set to the hosted project | everything |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys | everything |
| `SUPABASE_SECRET_KEY` | same page, secret key | adding staff, online payments |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | email links |
| `RAZORPAY_API_KEY`, `RAZORPAY_SECRET` | Razorpay test mode keys | "Pay now" in the portal |
| `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | Gmail address and app password | sending invoices and reminders |

The hosted database already holds the schema and the demo data, so there is
nothing to migrate. To stand up your own copy instead, run the files in
`supabase/migrations/` in order, then `supabase/seed.sql`.

## Test accounts for evaluators

All three use the same password: **`Brightloop#Eval26`**

| role | email | lands on | try this |
|---|---|---|---|
| Admin | `cleochariaofficial+evaladmin@gmail.com` | `/dashboard` | add a product with a Brand variant, create a discount, add a staff member in Settings, run billing |
| Staff | `cleochariaofficial+evalstaff@gmail.com` | `/dashboard` | create a subscription from a quotation template, confirm an invoice, record a payment. Discounts, taxes and the team are read-only here |
| Customer | `cleochariaofficial+evalcustomer@gmail.com` | `/portal` | Naveen Iyer of Iyer Foods: 5 subscriptions and about 50 invoices. Pay an open invoice online, pause a subscription |

Online payments run in Razorpay **test mode**. Use card `4111 1111 1111 1111`,
any future expiry, any CVV, and any OTP. Or pick UPI with `success@razorpay`.

You can also sign up as a new customer from the landing page. The password
rules from the brief apply.

The database holds 688 customers, about 2,100 subscriptions, 6,800 invoices
and 6,000 payments, so the lists, filters and dashboard run at the volume the
brief describes.

## How the brief maps to the app

| scene from the brief | where it lives |
|---|---|
| **A new customer signs up**: one account per email; password over 8 characters with upper, lower and special; reset link by email | `/signup`, `/login`, `/forgot-password` |
| Admin, staff and customer see different things; only the admin adds staff | role-aware navigation, row level security in Postgres, Settings → Team |
| **Launching a new plan**: product name, type, sales and cost price, notes; variants with an extra price (Brand: Odoo +560) | `/products` |
| Plan price, daily / weekly / monthly / yearly billing, minimum quantity, availability dates; auto-close, closable, pausable, renewable per plan | `/plans` |
| **Turning a quote into a subscription**: quotation templates valid for a set number of days | `/templates`, "New from template" |
| Subscription number, customer, plan, dates, payment terms, lines; Draft → Quotation → Confirmed → Active → Closed | `/subscriptions`, status pipeline and timeline on each |
| **Billing day**: invoices generated from subscriptions with lines, taxes and totals; never billed twice or skipped | `/billing` (run now, plus a nightly job), one invoice per subscription per period enforced by a unique index |
| Confirm, cancel, send, print; Draft → Confirmed → Paid | `/invoices/[id]`, PDF download and email |
| **A customer asks for a better price**: admin-only discounts, fixed or percent, minimums, dates, usage limit, per product or whole subscription; applied automatically and stopped when expired or used up | `/discounts`, applied inside the billing run |
| **The money comes in**: payments with method, amount, date and note; paid vs outstanding; overdue chasing | `/payments` with aging and reminder emails, `/invoices` filters |
| **The finance lead**: active subscriptions, revenue, payments, overdue, with filters and a summary | `/dashboard` with date range, charts and a six-month forecast |
| Customers manage their own subscriptions without emailing anyone | `/portal`: subscribe to a plan, pay online, pause, resume or cancel |

On top of the brief: global search (Ctrl / ⌘ K), CSV export on every list,
light and dark themes, list tables that turn into cards on phones, branded
auth emails.

## How it is built

- **Pages never touch the database.** Pages call `src/services/`, and the
  services call Supabase.
- **Rules live in Postgres.** Lifecycle transitions, plan flags, tax and
  discount maths, the billing run and the "never bill twice" guarantee are
  triggers and functions, so the screens cannot get them wrong.
- **Access is row level security.** A customer's session can only read that
  customer's rows, staff cannot write discounts, taxes or roles, and the
  admin can do everything.

| folder | what is in it |
|---|---|
| `src/app/(public)` | landing page and auth screens |
| `src/app/(app)` | the console for admin and staff |
| `src/app/portal` | the customer portal |
| `src/services` | every read and write |
| `supabase/migrations` | schema, triggers, access rules, billing functions |
| `docs/` | schema, services, auth and design references |

## Docs

- [`docs/SCHEMA.md`](docs/SCHEMA.md): tables, columns and lifecycle rules
- [`docs/SERVICES.md`](docs/SERVICES.md): every service function
- [`docs/AUTH.md`](docs/AUTH.md): roles and sign-in flows
- [`docs/DESIGN.md`](docs/DESIGN.md): colours, type and components
- [`docs/FEATURES.md`](docs/FEATURES.md): the brief, requirement by requirement
