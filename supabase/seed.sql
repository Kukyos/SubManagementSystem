-- Demo data at volume: catalogue, ~600 customers, ~2,000 subscriptions with
-- 18 months of invoices and payments. Run once, as the database owner, after
-- the migrations. Demo logins (admin, staff, customer) are created in Supabase
-- Auth; the customer one is linked to its customers row by email.
--
-- Emails use the reserved .example domain so nothing here can reach a real inbox.

select setseed(0.42);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
insert into public.products (name, type, sales_price, cost_price, tax_id, notes)
select v.name, v.type::public.product_type, v.price, v.cost, t.id, v.notes
from (values
  ('Brightloop CRM seat', 'service', 1200, 310, 'GST 18%', 'Pipeline, contacts and email sync. Priced per user.'),
  ('Brightloop Books', 'service', 1800, 420, 'GST 18%', 'Accounting, GST returns and bank reconciliation for one company.'),
  ('Helpdesk agent seat', 'service', 900, 240, 'GST 18%', 'Ticketing, SLAs and a customer-facing help centre. Per agent.'),
  ('Payroll module', 'service', 2200, 600, 'GST 18%', 'Salary runs, PF / ESI and payslips for up to 50 employees.'),
  ('Priority support', 'addon', 1500, 700, 'GST 18%', 'Four-hour response, a named engineer and quarterly reviews.'),
  ('Extra storage, 100 GB', 'addon', 400, 90, 'GST 18%', 'Attachment and document storage on top of the plan allowance.'),
  ('WhatsApp messaging', 'addon', 600, 260, 'GST 18%', 'Send invoices and reminders over WhatsApp Business.'),
  ('Barcode scanner', 'goods', 4500, 3100, 'GST 12%', 'Handheld USB scanner, rented with the inventory plan.'),
  ('Onboarding workshop', 'service', 8000, 3500, 'GST 18%', 'Two half-day sessions to set up the account with your team.')
) as v(name, type, price, cost, tax, notes)
join public.taxes t on t.name = v.tax
where not exists (select 1 from public.products p where p.name = v.name);

insert into public.product_variants (product_id, attribute, value, extra_price)
select p.id, v.attribute, v.value, v.extra
from (values
  ('Brightloop CRM seat', 'Tier', 'Pro', 400),
  ('Brightloop CRM seat', 'Tier', 'Enterprise', 900),
  ('Brightloop Books', 'Companies', 'Up to 3', 1100),
  ('Helpdesk agent seat', 'Channel', 'Email + chat', 250),
  ('Odoo ERP licence', 'Edition', 'Enterprise', 1400),
  ('Barcode scanner', 'Model', 'Wireless', 1200)
) as v(product, attribute, value, extra)
join public.products p on p.name = v.product
on conflict do nothing;

insert into public.plans (name, product_id, price, billing_period, billing_interval, min_quantity,
                          auto_close, closable, pausable, renewable, description)
select v.name, p.id, v.price, v.period::public.billing_period, v.every, v.min_qty,
       v.auto_close, v.closable, v.pausable, true, v.description
from (values
  ('CRM, monthly', 'Brightloop CRM seat', 1200, 'monthly', 1, 1, false, true, true, 'Per seat, billed every month. Cancel any time.'),
  ('CRM, yearly', 'Brightloop CRM seat', 12000, 'yearly', 1, 1, false, false, false, 'Two months free against monthly. Billed once a year.'),
  ('Books, monthly', 'Brightloop Books', 1800, 'monthly', 1, 1, false, true, true, 'Full accounting for one company, billed monthly.'),
  ('Books, yearly', 'Brightloop Books', 18000, 'yearly', 1, 1, false, false, false, 'Full accounting for one company, billed yearly.'),
  ('Helpdesk team', 'Helpdesk agent seat', 900, 'monthly', 1, 3, false, true, true, 'For support teams of three agents or more.'),
  ('Payroll, monthly', 'Payroll module', 2200, 'monthly', 1, 1, false, true, true, 'Runs payroll every month for up to 50 employees.'),
  ('Odoo ERP, yearly', 'Odoo ERP licence', 26000, 'yearly', 1, 1, false, false, false, 'Annual Odoo licence with hosting and upgrades.'),
  ('Priority support, monthly', 'Priority support', 1500, 'monthly', 1, 1, false, true, false, 'Add to any plan. Not pausable: the engineer stays booked.'),
  ('Scanner rental, quarterly', 'Barcode scanner', 1350, 'monthly', 3, 1, false, true, true, 'Billed every three months; swap the device any time.'),
  ('CRM trial, weekly', 'Brightloop CRM seat', 300, 'weekly', 1, 1, true, true, false, 'Four-week paid trial that closes itself when it ends.')
) as v(name, product, price, period, every, min_qty, auto_close, closable, pausable, description)
join public.products p on p.name = v.product
where not exists (select 1 from public.plans pl where pl.name = v.name);

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
insert into public.customers (name, email, phone, company, address, city, country, tax_number, created_at)
select fn || ' ' || ln,
       lower(fn || '.' || ln) || '@' || lower(ln || sx) || '.example',
       '+91 9' || lpad((floor(random() * 1e9))::bigint::text, 9, '0'),
       ln || ' ' || sx,
       (floor(random() * 240) + 1)::int || ', ' || street,
       city, 'India',
       state_code || upper(substr(md5(fn || ln || sx), 1, 5)) || (floor(random() * 9000) + 1000)::int || 'F1Z' || (floor(random() * 9) + 1)::int,
       now() - (random() * interval '600 days')
from (
  select (array['Aarav','Priya','Karthik','Ananya','Rohan','Divya','Vikram','Lakshmi','Arjun','Sneha','Rahul','Meena','Siddharth','Kavya','Aditya','Nisha','Harish','Pooja','Manoj','Revathi','Imran','Fatima','Joseph','Ritu','Gaurav','Shalini','Naveen','Asha','Deepak','Swathi','Vivek','Anjali','Suresh','Tara','Farhan','Isha','Prakash','Gayathri','Nikhil','Zara'])[1 + floor(random() * 40)::int] as fn,
         (array['Iyer','Nair','Sharma','Reddy','Menon','Patel','Rao','Gupta','Krishnan','Das','Kulkarni','Bose','Pillai','Joshi','Mehta','Shetty','Chatterjee','Naidu','Verma','Hegde','Kapoor','Banerjee','Desai','Subramanian','Agarwal','Mathew','Varghese','Khan','Thomas','Sinha'])[1 + floor(random() * 30)::int] as ln,
         (array['Textiles','Logistics','Foods','Pharma','Engineering','Traders','Studios','Clinics','Exports','Infotech','Interiors','Motors','Agro','Retail','Constructions'])[1 + floor(random() * 15)::int] as sx,
         (array['Anna Salai','MG Road','Linking Road','FC Road','Banjara Hills','Connaught Place','Marine Drive','Race Course Road','CG Road','MI Road'])[1 + floor(random() * 10)::int] as street,
         c.city, c.state_code
  from generate_series(1, 700) g
  cross join lateral (
    select * from (values ('Chennai','33'),('Bengaluru','29'),('Mumbai','27'),('Pune','27'),('Hyderabad','36'),
                          ('New Delhi','07'),('Kochi','32'),('Coimbatore','33'),('Ahmedabad','24'),('Jaipur','08')) as c(city, state_code)
    where g = g order by random() limit 1
  ) c
) people
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Subscriptions: one to five per customer, starting between the customer's
-- first day and today. Inserted in start order so SUB numbers follow time.
-- ---------------------------------------------------------------------------
insert into public.subscriptions (customer_id, plan_id, status, start_date, expiry_date, next_invoice_date,
                                  payment_terms, salesperson_id, created_at)
select customer_id, plan_id, 'active', start_date,
       -- About one in seven ended at some point (closed after billing below).
       case when random() < 0.14 and start_date < current_date - 150
            then least(current_date - 7, (start_date + (floor(random() * 10) + 3)::int * interval '1 month')::date - 1) end,
       start_date, terms::public.payment_terms, salesperson_id, start_date + interval '10 hours'
from (
  select c.id as customer_id, pl.id as plan_id,
         (c.since + floor(random() * (current_date - c.since + 1))::int) as start_date,
         (array['immediate','net_7','net_15','net_15','net_30','net_30','net_45'])[1 + floor(random() * 7)::int] as terms,
         (select id from public.profiles where role in ('admin','staff') and g = g order by random() limit 1) as salesperson_id
  -- Customers with a portal login get a longer history, so the portal has something to show.
  from (select *, case when user_id is null then created_at::date else current_date - 420 end as since
        from public.customers) c
  cross join lateral generate_series(1, 1 + floor(random() * 4.5 + 0 * length(c.email))::int) g
  cross join lateral (
    select id from public.plans
    where is_active and billing_period <> 'weekly' and g = g
    order by random() limit 1
  ) pl
  where c.email like '%.example' or c.user_id is not null
) s
order by start_date;

-- A few recent weekly trials.
insert into public.subscriptions (customer_id, plan_id, status, start_date, expiry_date, next_invoice_date, payment_terms, created_at)
select c.id, pl.id, 'active', d, d + 27, d, 'immediate', d + interval '9 hours'
from (select id, current_date - floor(random() * 50)::int as d from public.customers where email like '%.example' order by random() limit 40) c
cross join public.plans pl where pl.name = 'CRM trial, weekly'
order by d;

-- Lines: the plan's product (seats for per-user products), sometimes a variant,
-- and on a third of monthly plans an add-on.
insert into public.subscription_lines (subscription_id, product_id, variant_id, quantity, unit_price, position)
select s.id, pl.product_id, v.id,
       case when p.name like '%seat%' then greatest(pl.min_quantity, 1 + floor(random() * 18)::int) else pl.min_quantity end,
       pl.price + coalesce(v.extra_price, 0) * case pl.billing_period when 'yearly' then 10 else pl.billing_interval end,
       0
from public.subscriptions s
join public.plans pl on pl.id = s.plan_id
join public.products p on p.id = pl.product_id
left join lateral (
  select id, extra_price from public.product_variants
  where product_id = pl.product_id and random() < 0.35 and s.id = s.id
  order by random() limit 1
) v on true
where not exists (select 1 from public.subscription_lines l where l.subscription_id = s.id);

insert into public.subscription_lines (subscription_id, product_id, quantity, unit_price, position)
select s.id, a.id, 1, a.sales_price, 1
from public.subscriptions s
join public.plans pl on pl.id = s.plan_id and pl.billing_period = 'monthly' and pl.billing_interval = 1
cross join lateral (
  select id, sales_price from public.products
  where name in ('Extra storage, 100 GB', 'WhatsApp messaging') and s.id = s.id
  order by random() limit 1
) a
where random() < 0.33 and pl.product_id <> a.id
  and not exists (select 1 from public.subscription_lines l where l.subscription_id = s.id and l.position = 1);

-- ---------------------------------------------------------------------------
-- Billing: every period from start to today. The migration's function does the
-- work, so seeded invoices follow exactly the same rules as real ones.
-- ---------------------------------------------------------------------------
select sum(public.bill_subscription(id, current_date)) from public.subscriptions where status = 'active';

-- Ended contracts close; some active ones pause.
update public.subscriptions s set status = 'closed',
  close_reason = (array['Contract ended', 'Moved to a yearly plan', 'Company closed the branch', 'Switched to another vendor'])[1 + floor(random() * 4)::int]
where status = 'active' and expiry_date < current_date;

update public.subscriptions s set status = 'paused'
from public.plans pl
where pl.id = s.plan_id and pl.pausable and s.status = 'active' and random() < 0.04;

-- Pipeline: recent drafts, quotations and confirmed deals not yet started.
insert into public.subscriptions (customer_id, plan_id, status, start_date, payment_terms, salesperson_id, created_at)
select c.id, pl.id, 'draft', current_date + floor(random() * 20)::int, 'net_15',
       (select id from public.profiles where role in ('admin','staff') and c.id = c.id order by random() limit 1),
       now() - random() * interval '12 days'
from (select id from public.customers where email like '%.example' order by random() limit 90) c
cross join lateral (
  select id from public.plans
  where is_active and billing_period = 'monthly' and c.id = c.id
    and coalesce(available_from, current_date) <= current_date and coalesce(available_until, current_date) >= current_date
  order by random() limit 1
) pl;

insert into public.subscription_lines (subscription_id, product_id, quantity, unit_price)
select s.id, pl.product_id, greatest(pl.min_quantity, 1 + floor(random() * 8)::int), pl.price
from public.subscriptions s join public.plans pl on pl.id = s.plan_id
where s.status = 'draft' and not exists (select 1 from public.subscription_lines l where l.subscription_id = s.id);

update public.subscriptions set status = 'quotation' where status = 'draft' and random() < 0.5;
update public.subscriptions set status = 'confirmed' where status = 'quotation' and random() < 0.4;

-- ---------------------------------------------------------------------------
-- Invoices: numbered in date order, confirmed, and mostly paid.
-- ---------------------------------------------------------------------------
-- Two passes: renumbering in place would collide with numbers not yet moved.
update public.invoices set number = id::text;
update public.invoices i set number = 'INV/' || to_char(n.invoice_date, 'YYYY') || '/' || lpad(n.rn::text, 5, '0')
from (select id, invoice_date, row_number() over (order by invoice_date, created_at, id) rn from public.invoices) n
where n.id = i.id;
select setval('public.invoice_number_seq', (select count(*) from public.invoices));

-- Anything older than three days is confirmed; the last few stay draft for review.
update public.invoices set status = 'confirmed', confirmed_at = invoice_date + interval '11 hours'
where status = 'draft' and invoice_date < current_date - 3;

-- 93% of past-due invoices are paid in full, 3% partly; the rest are overdue.
-- Invoices not yet due are paid about half the time.
insert into public.payments (invoice_id, customer_id, method, amount, paid_on, reference, created_at)
select i.id, i.customer_id, m.method::public.payment_method,
       case when r < 0.03 then round(i.total * 0.5, 2) else i.total end,
       pd, case when m.method in ('bank_transfer','upi','cheque') then upper(substr(md5(i.id::text), 1, 12)) end,
       pd + interval '15 hours'
from (
  select i.*, random() as r,
         least(current_date, i.invoice_date + floor(random() * (greatest(i.due_date - i.invoice_date, 0) + 6))::int) as pd
  from public.invoices i where i.status = 'confirmed'
) i
cross join lateral (
  select (array['bank_transfer','bank_transfer','upi','upi','card','cheque','cash'])[1 + floor(random() * 7)::int] as method
  where i.id = i.id
) m
where (i.due_date < current_date and i.r < 0.96) or (i.due_date >= current_date and i.r < 0.5);

update public.invoices i set paid_at = p.last + interval '15 hours'
from (select invoice_id, max(paid_on) as last from public.payments group by invoice_id) p
where p.invoice_id = i.id and i.status = 'paid';

-- Closing and pausing happened at some point in the past, not today.
update public.subscriptions set closed_at = expiry_date + interval '1 day 1 hour' where status = 'closed' and expiry_date is not null;
update public.subscriptions set paused_at = now() - random() * interval '40 days' where status = 'paused';

-- The triggers stamped every timeline entry with today; move them to when they happened.
update public.activity_log a set created_at = case when s.status in ('draft', 'quotation', 'confirmed') then s.created_at else s.start_date + interval '10 hours' end
from public.subscriptions s where a.entity = 'subscriptions' and a.entity_id = s.id and a.action = 'created';
update public.activity_log a set created_at = case a.to_status when 'closed' then s.closed_at when 'paused' then s.paused_at else s.created_at + interval '2 hours' end
from public.subscriptions s where a.entity = 'subscriptions' and a.entity_id = s.id and a.action = 'status';
update public.activity_log a set created_at = i.invoice_date + interval '9 hours'
from public.invoices i where a.entity = 'invoices' and a.entity_id = i.id and a.action = 'created';
update public.activity_log a set created_at = coalesce(case a.to_status when 'paid' then i.paid_at end, i.confirmed_at)
from public.invoices i where a.entity = 'invoices' and a.entity_id = i.id and a.action = 'status';
update public.activity_log a set created_at = p.created_at
from public.payments p where a.entity = 'invoices' and a.entity_id = p.invoice_id and a.action = 'payment';


-- ---------------------------------------------------------------------------
-- Quotation templates
-- ---------------------------------------------------------------------------
insert into public.quotation_templates (name, plan_id, validity_days, duration_periods, payment_terms, notes)
select v.name, pl.id, v.validity, v.duration, v.terms::public.payment_terms, v.notes
from (values
  ('Sales team starter, 12 months', 'CRM, monthly', 15, 12, 'net_15', 'Five CRM seats with onboarding. Price held for the first year.'),
  ('Finance pack, yearly', 'Books, yearly', 30, 1, 'net_30', 'Books and payroll together, billed once a year.'),
  ('Support desk, 6 months', 'Helpdesk team', 21, 6, 'net_15', 'Three helpdesk agents with priority support for the first half-year.'),
  ('Odoo rollout, quarterly', 'Odoo Standard, quarterly', 30, null, 'net_30', 'Odoo ERP on quarterly billing with a scanner for the warehouse.')
) as v(name, plan, validity, duration, terms, notes)
join public.plans pl on pl.name = v.plan;

insert into public.quotation_template_lines (template_id, product_id, quantity, unit_price, position)
select t.id, p.id, v.qty, v.price, v.pos
from (values
  ('Sales team starter, 12 months', 'Brightloop CRM seat', 5, null::numeric, 0),
  ('Sales team starter, 12 months', 'Onboarding workshop', 1, 0, 1),
  ('Finance pack, yearly', 'Brightloop Books', 1, null, 0),
  ('Finance pack, yearly', 'Payroll module', 1, 22000, 1),
  ('Support desk, 6 months', 'Helpdesk agent seat', 3, null, 0),
  ('Support desk, 6 months', 'Priority support', 1, null, 1),
  ('Odoo rollout, quarterly', 'Odoo ERP licence', 1, null, 0),
  ('Odoo rollout, quarterly', 'Barcode scanner', 2, null, 1)
) as v(template, product, qty, price, pos)
join public.quotation_templates t on t.name = v.template
join public.products p on p.name = v.product;

-- ---------------------------------------------------------------------------
-- Discounts
-- ---------------------------------------------------------------------------
insert into public.discounts (name, code, type, value, scope, min_purchase, min_quantity, starts_on, ends_on, usage_limit, is_active)
values
  ('CRM seats, 10% off five or more', 'CRM5PLUS', 'percent', 10, 'products', 0, 5, null, null, null, true),
  ('Helpdesk launch offer', 'DESK500', 'fixed', 500, 'products', 0, 0, '2026-09-01', '2026-12-31', 300, true),
  ('Diwali 2025, 20% off Books', 'DIWALI25', 'percent', 20, 'products', 0, 0, '2025-10-15', '2025-11-15', null, true),
  ('Nonprofit pricing', 'NGO15', 'percent', 15, 'subscription', 0, 0, null, null, null, true),
  ('Loyalty credit, ₹1,000 off', 'LOYAL1000', 'fixed', 1000, 'subscription', 5000, 0, null, null, 500, true),
  ('Startup India, first quarter free of support', null, 'percent', 100, 'products', 0, 0, '2026-01-01', '2026-03-31', 50, false);

insert into public.discount_products (discount_id, product_id)
select d.id, p.id
from (values
  ('CRM5PLUS', 'Brightloop CRM seat'),
  ('DESK500', 'Helpdesk agent seat'),
  ('DIWALI25', 'Brightloop Books')
) as v(code, product)
join public.discounts d on d.code = v.code
join public.products p on p.name = v.product;

insert into public.discount_products (discount_id, product_id)
select d.id, p.id from public.discounts d, public.products p
where d.name like 'Startup India%' and p.name = 'Priority support';
