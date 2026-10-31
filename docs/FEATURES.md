# Features

Every requirement in the brief, where it lives, and its state. Then what we
add on top. ✅ built · 🟡 data layer done, screen pending · ⬜ not started.

## From the brief

### A new customer signs up
| requirement | where | state |
|---|---|---|
| Account with email + password, one account per email | Supabase Auth, `/signup` | ✅ |
| Password > 8 chars, upper, lower, special character | signup form + server action + Auth policy | ✅ |
| Reset link to registered email | `/forgot-password`, `/auth/reset`, custom SMTP | ✅ |
| Admin / staff / customer see different things | `profiles.role`, RLS, role-aware layouts | 🟡 |
| Customers see only their own subscriptions and invoices | RLS + `/portal` | 🟡 |
| Only admin adds staff | `/settings`, service-key server action | ✅ |

### Launching a new plan
| requirement | where | state |
|---|---|---|
| Product: name, type, sales price, cost price, notes | `products`, `/products` | 🟡 |
| Variants with extra price (Brand: Odoo +560) | `product_variants` | 🟡 |
| Plan: price, daily / weekly / monthly / yearly, min quantity, availability dates | `plans`, `/plans` | 🟡 |
| Plan options: auto-close, closable early, pausable, renewable | `plans` flags, lifecycle trigger | 🟡 |

### Turning a quote into a subscription
| requirement | where | state |
|---|---|---|
| Quotation templates with plan, product lines, validity days | `quotation_templates`, `/templates` | 🟡 |
| Subscription number, customer, plan, start, expiry, payment terms | `subscriptions`, `/subscriptions/new` | ✅ |
| Lines: product, quantity, unit price, taxes, amount | `subscription_lines`, subscription page | ✅ |
| Draft → Quotation → Confirmed → Active → Closed, visible to the team | lifecycle trigger, status tabs, pipeline bar, activity timeline | ✅ |

### Billing day
| requirement | where | state |
|---|---|---|
| Invoices generated from subscriptions, details pre-filled | `bill_subscription`, `run_billing` | 🟡 |
| Taxes calculated from admin rules | `taxes`, line tax rate | 🟡 |
| Confirm, cancel, send, print | invoice detail page, print stylesheet; email is T3.1 | 🟡 |
| Draft → Confirmed → Paid | invoice trigger | 🟡 |
| Nothing billed twice or skipped | unique period index + catch-up loop | 🟡 |

### A customer asks for a better price
| requirement | where | state |
|---|---|---|
| Admin-only discount rules: fixed or %, min purchase / quantity, dates, usage limit | `discounts`, RLS | 🟡 |
| Applies to specific products or whole subscriptions | `discount_products`, `subscription_discounts` | 🟡 |
| Appears on the next invoice by itself; stops when expired or used up | billing function | 🟡 |

### The money comes in
| requirement | where | state |
|---|---|---|
| Record payment: method, amount, date, note, against an invoice | `payments`, record-payment dialog | 🟡 |
| See paid vs outstanding, chase overdue | invoice list filters, overdue view | ⬜ |

### The finance lead
| requirement | where | state |
|---|---|---|
| Active subscriptions, revenue, owed, overdue in one place | `finance_summary`, `/dashboard` | 🟡 |
| Filters and summary view | date range on dashboard, list filters | ⬜ |
| Every page under two seconds with thousands of subscriptions | indexes, server-side pagination, volume seed | ⬜ |

## Beyond the brief

| feature | why it matters | state |
|---|---|---|
| Nightly billing with pg_cron + "Run billing now" with a result report | billing day actually runs itself | 🟡 |
| Online payment in the portal (Razorpay test mode), signature-verified | customers pay without emailing anyone | ⬜ |
| Self-service subscribe from the portal | sign-up to paying customer with no staff involved | 🟡 |
| Customer pause / resume / cancel within plan rules | "manage their own subscriptions" taken literally | 🟡 |
| MRR, 12-month invoiced vs collected, new vs churned, top plans | the questions the finance lead actually asks | 🟡 |
| Status timeline on every subscription and invoice | "anyone on the team can see where it stands" | 🟡 |
| Invoice PDF / print view and email delivery | send and print, done properly | ⬜ |
| Overdue reminders (dunning) | chase before it becomes lost revenue | ⬜ |
| Revenue forecast from active subscriptions | next months' expected billing | ⬜ |
| Global search (customers, subscriptions, invoices) | thousands of rows need a way in | ✅ |
| CSV export of any list | finance always wants a spreadsheet | ✅ |
| Dark mode | | ⬜ |
