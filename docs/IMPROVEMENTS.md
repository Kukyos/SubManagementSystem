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
- **Shard field cost.** ~5,200 instances (1,600 on small screens) plus 250
  background shards, all placed in the vertex shader; the CPU only sets
  uniforms each frame. If a low-end phone still struggles, drop the count.

## Ideas

- Search on phones: the ⌘K box is hidden under 768px; a search icon in the
  small-screen header would open the same palette.
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

- React 19 resets a form after its action runs, and a `<select>` doesn't take
  a new `defaultValue`, so after a failed save the dropdowns snapped back to
  their first value while text fields kept what was typed. Forms that echo
  values back re-key their fieldset on the returned values.

_Add them as they happen, in the same push as the fix._

- The global `:focus-visible` ring in `globals.css` is unlayered, so it beats
  every Tailwind utility (`focus:outline-none` does nothing). An element that
  shows focus another way has to switch it off with an inline style.

- `auth.admin.createUser({ app_metadata: { role } })` makes the profile as a
  customer: the sign-up trigger runs before the role is written. Demo admin and
  staff were fixed by hand. `inviteStaff` has to set `profiles.role` itself
  after creating the user (and drop the stray customer row), or the trigger
  should also run on update of `raw_app_meta_data`.
- Per-instance CPU loops jank the whole page, not just the canvas. The shard
  field updated ~5,400 matrices and colours in JavaScript every frame, which
  held the main thread and made scrolling and CSS animations stutter. Moving
  the work into the vertex shader made frames a flat 16.7ms.
- Kill test servers by port, not by command line. A stale `next start` kept
  answering on the test port with an old build manifest, so a fresh build
  looked broken (500 on its CSS).

- Payments list has no filtered total: PostgREST aggregates are off and a
  client-side sum would stop at the 1,000-row cap. A `payments_summary(...)`
  SQL function would add it. Overdue aging is bucketed in the app for the same
  reason it's fine today (a few hundred rows); move it to SQL if it grows.
