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
| `inviteStaff(formData)` (admin) | ⬜ |

## catalogue (`services/catalogue.ts`)
| function | state |
|---|---|
| `listProducts(query)` (`show`: active / archived / all), `getProduct(id)` (with variants; cost for staff) | ✅ |
| `saveProduct(state, formData)`, `archiveProduct(id, archived?)` (`services/catalogue-actions.ts`) | ✅ |
| `saveVariant(state, formData)`, `deleteVariant(id, productId)` (`services/catalogue-actions.ts`) | ✅ |
| `listPlans(query)` (with active subscription count), `getPlan(id)`, `savePlan(state, formData)` | ✅ |
| `listProductOptions(keepId?)`: active products for pickers, plus the one already chosen | ✅ |
| `listTaxes()` | ✅ |
| `saveTax(formData)` | ⬜ |
| `listTemplates()`, `getTemplate(id)`, `saveTemplate(formData)` | ⬜ |
| `listDiscounts(query)`, `getDiscount(id)`, `saveDiscount(formData)` | ⬜ |

## customers (`services/customers.ts`)
| function | state |
|---|---|
| `listCustomers(query)`, `getCustomer(id)` (with subs, invoices, balance) | ⬜ |
| `saveCustomer(formData)` | ⬜ |

## subscriptions (`services/subscriptions.ts`)
| function | state |
|---|---|
| `listSubscriptions(query)` (status, plan, customer, date filters) | ⬜ |
| `getSubscription(id)` (lines, discounts, invoices, timeline) | ⬜ |
| `createSubscription(formData)` (blank or from template) | ⬜ |
| `saveLines(id, lines)` | ⬜ |
| `setStatus(id, status, reason?)` | ⬜ |
| `renewSubscription(id)`, `billNow(id)` | ⬜ |
| `attachDiscount(id, discountId)`, `detachDiscount(id, discountId)` | ⬜ |

## invoices (`services/invoices.ts`)
| function | state |
|---|---|
| `listInvoices(query)` (status, overdue, customer, date filters) | ⬜ |
| `getInvoice(id)` (lines, payments, timeline) | ⬜ |
| `setInvoiceStatus(id, status)`, `confirmDrafts(ids)` | ⬜ |
| `sendInvoice(id)` (email with PDF) | ⬜ |
| `runBilling(asOf?)` | ⬜ |

## payments (`services/payments.ts`)
| function | state |
|---|---|
| `listPayments(query)` | ⬜ |
| `recordPayment(formData)` | ⬜ |
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
