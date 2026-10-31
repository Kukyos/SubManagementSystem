# Improvements

What could be better. Known gaps, ideas not yet scheduled, and lessons from
this build. Move an idea into `TASKS.md` when someone takes it on.

## Known gaps

- **Proration.** Changing quantity mid-period takes effect from the next
  invoice; there is no partial-period credit or charge.
- **Refunds.** A payment can be deleted by an admin, but there is no refund
  record or credit note.
- **Multi-currency.** Everything is INR.
- **Billing ahead of today.** `run_billing` refuses future dates, so there is
  no "preview next month's invoices" yet.

- **Landing on mobile** hasn't been checked on a real phone yet (P7).
- **Shard field cost.** ~5,200 instances (1,600 on small screens), with
  position, hover and edge colour all updated on the CPU each frame. Fine on a
  laptop; if a low-end phone stutters, move the morph into a vertex shader
  or drop the count further.

## Ideas

- Feed the dashboard's shard field from real subscriptions: colour by plan,
  dim when paused, pulse amber when an invoice is overdue.

- Upcoming-invoice preview on each subscription (what the next invoice will
  contain, with discounts applied).
- Plan upgrade / downgrade from the portal.
- Usage-based lines (metered add-ons).
- Webhook from Razorpay as a second confirmation path besides the client
  callback.
- Audit of who changed prices and discounts, not only statuses.

## Lessons

_Add them as they happen, in the same push as the fix._
