# Services

Every function a page may call. Pages import from `src/services/`; nothing
else touches Supabase. Services run on the server (Server Components and
Server Actions) with the signed-in user's session, so RLS applies.

Conventions:

- Reads return typed rows or throw. Pages wrap them with their loading and
  error states.
- Mutations are Server Actions returning `{ ok: true, data } | { ok: false,
  error }` with a message a person can read. They `revalidatePath` what they
  change.
- Lists take `{ page, pageSize, search, filters, sort }` and return
  `{ rows, total }`. Pagination is server-side; no list loads everything.
- Types live in `src/types/models.ts` and match `SCHEMA.md`.
- Products are always selected with an explicit column list (never `*`,
  never `products(*)` in an embed). See the note on `cost_price` in
  `SCHEMA.md`.

State: ✅ implemented · ⬜ planned (signature agreed, not written yet).

## auth (`services/auth.ts`)
| function | state |
|---|---|
| `getCurrentUser(): { id, email, role, fullName, customerId } \| null` | ✅ |
| `requireRole(...roles)`: redirects if the user lacks the role | ✅ |
| `signOut()` (`services/auth-actions.ts`) | ✅ |
| `signUp(state, formData)`, `signIn(state, formData)`: for `useActionState` | ✅ |
| `requestPasswordReset(state, formData)`, `updatePassword(state, formData)` | ✅ |
| `safeNext(next)`: same-site `?next=` paths only | ✅ |
| `completeAuthLink(searchParams)`: finishes a confirmation or reset link | ✅ |
| `inviteStaff(state, formData)` (admin; `services/auth-actions.ts`) | ✅ |
| `listTeam()`: admin and staff profiles | ✅ |

## catalogue (`services/catalogue.ts`)
| function | state |
|---|---|
| `listProducts(query)` (`show`: active / archived / all), `getProduct(id)` (with variants; cost for staff) | ✅ |
| `saveProduct(state, formData)`, `archiveProduct(id, archived?)` (`services/catalogue-actions.ts`) | ✅ |
| `saveVariant(state, formData)`, `deleteVariant(id, productId)` (`services/catalogue-actions.ts`) | ✅ |
| `listPlans(query)` (with active subscription count), `getPlan(id)`, `savePlan(state, formData)` | ✅ |
| `listProductOptions(keepId?)`: active products for pickers, plus the one already chosen | ✅ |
| `listTaxes()` | ✅ |
| `listVariantOptions()`: every variant, for line pickers | ✅ |
| `saveTax(state, formData)` (admin; one default at a time) | ✅ |
| `listTemplates()` (with line and use counts), `getTemplate(id)` (with lines) | ✅ |
| `saveTemplate(state, formData)`, `addTemplateLine(state, formData)`, `removeTemplateLine(id, templateId)` (admin; `services/catalogue-actions.ts`) | ✅ |
| `listDiscounts(query)` (product and subscription counts), `getDiscount(id)` (with covered products), `listDiscountOptions()` (live subscription-scope) | ✅ |
| `saveDiscount(state, formData)` (admin; replaces covered products) | ✅ |

## customers (`services/customers.ts`)
| function | state |
|---|---|
| `listCustomers(query)` (active subs, outstanding, overdue), `getCustomer(id)` (with subs, invoices, balance) | ✅ |
| `listCustomerOptions()`: names for pickers | ✅ |
| `saveCustomer(state, formData)` (`services/customer-actions.ts`) | ✅ |

## subscriptions (`services/subscriptions.ts`)
| function | state |
|---|---|
| `listSubscriptions(query)` (status, plan, customer filters), `subscriptionCounts()` | ✅ |
| `getSubscription(id)` (lines, invoices, timeline), `getTimeline(entityId)` | ✅ |
| `createSubscription(state, formData)`: blank, or from a `templateId` (plan, terms, lines, contract length) | ✅ |
| `addLine(state, formData)`, `setLineQuantity(lineId, subId, formData)`, `removeLine(lineId, subId)`: unit price is computed on the server | ✅ |
| `setStatus(state, formData)` (`id`, `status`, `reason`) | ✅ |
| `renewSubscription(state, formData)`, `billNow(state, formData)` | ✅ |
| `attachDiscount(state, formData)`, `detachDiscount(id, discountId)` | ✅ |

## invoices (`services/invoices.ts`)
| function | state |
|---|---|
| `listInvoices(query)` (status incl. overdue, customer, search), `invoiceCounts()` | ✅ |
| `getInvoice(id)` (lines, payments, timeline) | ✅ |
| `setInvoiceStatus(state, formData)`, `confirmDrafts(ids)` (`services/invoice-actions.ts`) | ✅ |
| `sendInvoice(id)` (email with PDF) | ⬜ |
| `runBilling(asOf?)` | ⬜ |

## payments (`services/payments.ts`)
| function | state |
|---|---|
| `listPayments(query)` | ⬜ |
| `recordPayment(state, formData)` (`services/invoice-actions.ts`) | ✅ |
| `createGatewayOrder(invoiceId)`, `verifyGatewayPayment(payload)` | ⬜ |

## reports (`services/reports.ts`)
| function | state |
|---|---|
| `getFinanceSummary(from?, to?)` | ⬜ |
| `search(term)` (customers, subscriptions, invoices) | ⬜ |

## portal (`services/portal.ts`)
| function | state |
|---|---|
| `myOverview()` (subscriptions, open invoices, balance) | ⬜ |
| `subscribe(planId, quantity, variantId?)` | ⬜ |
| `subscriptionAction(id, 'pause' \| 'resume' \| 'cancel')` | ⬜ |
