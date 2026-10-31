# Schema

Source of truth for the data model. The SQL lives in `supabase/migrations/`;
this file explains it. Change both in the same commit.

Money is `numeric(12,2)` / `numeric(14,2)`, in INR. Dates are `date`; event
times are `timestamptz`.

## Enums

| enum | values |
|---|---|
| `user_role` | admin, staff, customer |
| `product_type` | service, goods, addon |
| `billing_period` | daily, weekly, monthly, yearly |
| `subscription_status` | draft, quotation, confirmed, active, paused, closed |
| `invoice_status` | draft, confirmed, paid, cancelled |
| `payment_method` | cash, bank_transfer, card, upi, cheque, online |
| `payment_terms` | immediate, net_7, net_15, net_30, net_45, net_60 |
| `discount_type` | percent, fixed |
| `discount_scope` | products, subscription |

## People

**profiles**: one per auth user, created by trigger on sign-up.
`id` (= auth user id) · `role` · `full_name` · `email` · `phone` · `created_at`.
Role comes from `app_metadata.role` (settable only with the service key);
anyone signing up publicly is a `customer`.

**customers**: the billing contact. May exist before the person has a login.
`id` · `user_id` (nullable, unique) · `name` · `email` (unique,
case-insensitive) · `phone` · `company` · `address` · `city` · `country` ·
`tax_number` · `notes` · `created_by` · `created_at`.
When a customer signs up, the trigger links them to an existing record with
the same email, or creates one.

## Catalogue

**taxes**: `id` · `name` · `rate` (percent) · `is_default` (at most one) ·
`is_active`.

**products**: `id` · `name` · `type` · `sales_price` · `cost_price` ·
`tax_id` · `notes` · `is_active`.
`cost_price` is not readable by customers; staff read it through
`product_costs()`.
**Always list product columns explicitly.** `select('*')` on products, an
embed like `products(*)`, or `.insert().select()` without a column list asks
for `cost_price` and fails for every role, admin included.

**product_variants**: `id` · `product_id` · `attribute` (e.g. Brand) ·
`value` (e.g. Odoo) · `extra_price` (e.g. 560). Unique per product +
attribute + value. A line's unit price is the base price plus the variant's
extra price.

**plans**: `id` · `name` · `product_id` (the product the plan sells) ·
`price` (per unit, per billing cycle) · `billing_period` · `billing_interval`
(every N periods) · `min_quantity` · `available_from` / `available_until` ·
`auto_close` (closes itself after the subscription's expiry) · `closable`
(may be closed early) · `pausable` · `renewable` · `description` ·
`is_active`.

**quotation_templates**: `id` · `name` · `plan_id` · `validity_days` ·
`duration_periods` (contract length in billing cycles; null = open-ended) ·
`payment_terms` · `notes`.
**quotation_template_lines**: `template_id` · `product_id` · `variant_id` ·
`description` · `quantity` · `unit_price` (null = product price) ·
`position`.

**discounts**: `id` · `name` · `code` · `type` · `value` · `scope` ·
`min_purchase` · `min_quantity` · `starts_on` / `ends_on` · `usage_limit` ·
`times_used` (maintained by billing) · `is_active`.
**discount_products**: which products a `products`-scope discount covers.
**subscription_discounts**: which subscriptions a `subscription`-scope
discount is attached to.

## Subscriptions

**subscriptions**: `id` · `number` (SUB-00001, automatic) · `customer_id` ·
`plan_id` · `template_id` · `status` · `start_date` · `expiry_date` ·
`next_invoice_date` · `payment_terms` · `quote_valid_until` ·
`salesperson_id` · `notes` · `paused_at` · `closed_at` · `close_reason` ·
`created_at` · `updated_at`.

**subscription_lines**: `subscription_id` · `product_id` · `variant_id` ·
`description` · `quantity` · `unit_price` · `tax_id` (null = product's tax) ·
`amount` (generated: quantity × unit price) · `position`.

### Lifecycle (enforced by trigger)

| from | allowed to |
|---|---|
| draft | quotation, confirmed, closed |
| quotation | draft, confirmed, closed |
| confirmed | active, closed |
| active | paused, closed |
| paused | active, closed |
| closed | active (renewal) |

- To **confirmed**: needs at least one line, total quantity ≥ the plan's
  minimum, and the plan available today.
- To **quotation**: `quote_valid_until` defaults to today + the template's
  validity days (30 if none).
- To **active**: billing starts from `start_date`. Resuming from **paused**
  bills from today, so paused time is never charged.
- To **paused**: only if the plan is pausable.
- **active → closed** before expiry: only if the plan is closable.
- **closed → active**: only if the plan is renewable.

## Invoices and payments

**invoices**: `id` · `number` (INV/2026/00001, automatic) ·
`subscription_id` · `customer_id` · `discount_id` (subscription-level
discount applied) · `status` · `invoice_date` · `due_date` · `period_start` /
`period_end` · `subtotal` · `discount_total` · `tax_total` · `total` ·
`amount_paid` · `confirmed_at` · `paid_at` · `cancelled_at` · `sent_at` ·
`notes`.
Money columns are derived from lines and payments; nobody writes them.
**One live invoice per subscription per period**: a unique index on
`(subscription_id, period_start)` excluding cancelled invoices. This is what
makes billing safe to re-run.

**invoice_lines**: `invoice_id` · `product_id` · `discount_id` ·
`description` · `quantity` · `unit_price` · `discount_amount` · `tax_rate` ·
generated `subtotal`, `tax_amount`, `total` · `position`.
Editable only while the invoice is a draft.

Invoice lifecycle: draft → confirmed → paid; draft or confirmed → cancelled
(not once money has been received). A confirmed invoice becomes paid on its
own when payments cover the total, and goes back to confirmed if a payment is
deleted. **Overdue** = confirmed and `due_date` before today.

**payments**: `invoice_id` · `customer_id` (copied from the invoice) ·
`method` · `amount` · `paid_on` · `note` · `reference` · `gateway_order_id` /
`gateway_payment_id` (online payments; the payment id is unique) ·
`recorded_by`.
Only against confirmed invoices, never more than the amount still due.

**billing_runs**: one row per billing run, from the console or the nightly
job. `as_of` · `ran_by` (null = nightly job) · `subscriptions_billed` ·
`invoices_created` · `subscriptions_closed` · `failed` (jsonb list of
`{subscription, id, error}`) · `duration_ms` · `created_at`.
Written only by `run_billing`; staff read it.

**activity_log**: `entity` (table name) · `entity_id` · `action` (created,
status, payment) · `from_status` / `to_status` · `message` · `actor_id` ·
`created_at`. Written by triggers; the status timeline on subscription and
invoice pages.

## Functions

| function | who | does |
|---|---|---|
| `run_billing(as_of)` | staff, pg_cron nightly 00:30 UTC | Invoices every due active subscription up to `as_of`, then closes expired auto-close plans. Logs a `billing_runs` row; returns its id, the counts and any per-subscription failures |
| `bill_now(subscription_id)` | staff | Bills one subscription up to today |
| `finance_summary(from, to)` | staff | Active subs, MRR, collected, invoiced, outstanding, overdue, status breakdown, 12-month series, top plans |
| `portal_subscribe(plan, qty, variant)` | customer | Creates an active subscription and its first confirmed invoice; returns the invoice id |
| `portal_subscription_action(id, action)` | customer | pause / resume / cancel their own subscription, within the plan's rules |
| `product_costs()` | staff | Cost price per product |
| `my_role()`, `is_staff()`, `is_admin()`, `my_customer_id()` | RLS helpers | |

### How an invoice is built (`bill_subscription`)

For each period from `next_invoice_date` up to the run date (and not past
`expiry_date`):

1. Insert the invoice; if that period already has one, skip it.
2. Copy each subscription line; tax is the line's tax or the product's.
3. Each line gets the best live `products` discount covering it (dates,
   usage limit, minimum quantity and purchase all checked on the period
   start).
4. The best live `subscription` discount attached to the subscription is
   spread across the lines by their share, with the rounding remainder on the
   largest line.
5. Each discount used bumps `times_used` once; when it reaches
   `usage_limit`, or `ends_on` passes, it stops applying.
6. `next_invoice_date` moves to the end of the period.
