-- Core schema: people, catalogue, subscriptions, invoicing, payments.
-- Business rules (status transitions, double-billing, payment roll-up) are
-- enforced here so every client path gets them for free.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'staff', 'customer');
create type public.product_type as enum ('service', 'goods', 'addon');
create type public.billing_period as enum ('daily', 'weekly', 'monthly', 'yearly');
create type public.subscription_status as enum ('draft', 'quotation', 'confirmed', 'active', 'paused', 'closed');
create type public.invoice_status as enum ('draft', 'confirmed', 'paid', 'cancelled');
create type public.payment_method as enum ('cash', 'bank_transfer', 'card', 'upi', 'cheque', 'online');
create type public.payment_terms as enum ('immediate', 'net_7', 'net_15', 'net_30', 'net_45', 'net_60');
create type public.discount_type as enum ('percent', 'fixed');
create type public.discount_scope as enum ('products', 'subscription');

create sequence public.subscription_number_seq;
create sequence public.invoice_number_seq;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  role        public.user_role not null default 'customer',
  full_name   text not null default '',
  email       text not null,
  phone       text,
  created_at  timestamptz not null default now()
);

create table public.customers (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users on delete set null,
  name        text not null check (length(trim(name)) > 0),
  email       text not null,
  phone       text,
  company     text,
  address     text,
  city        text,
  country     text not null default 'India',
  tax_number  text,
  notes       text,
  created_by  uuid references public.profiles on delete set null,
  created_at  timestamptz not null default now()
);
create unique index customers_email_key on public.customers (lower(email));

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------
create table public.taxes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  rate        numeric(5,2) not null check (rate >= 0 and rate <= 100),
  is_default  boolean not null default false,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index taxes_one_default on public.taxes (is_default) where is_default;

create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  type         public.product_type not null default 'service',
  sales_price  numeric(12,2) not null default 0 check (sales_price >= 0),
  cost_price   numeric(12,2) not null default 0 check (cost_price >= 0),
  tax_id       uuid references public.taxes on delete set null,
  notes        text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create table public.product_variants (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products on delete cascade,
  attribute    text not null,
  value        text not null,
  extra_price  numeric(12,2) not null default 0,
  unique (product_id, attribute, value)
);

create table public.plans (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (length(trim(name)) > 0),
  product_id        uuid references public.products on delete set null,
  price             numeric(12,2) not null default 0 check (price >= 0),
  billing_period    public.billing_period not null default 'monthly',
  billing_interval  int not null default 1 check (billing_interval between 1 and 36),
  min_quantity      int not null default 1 check (min_quantity >= 1),
  available_from    date,
  available_until   date,
  auto_close        boolean not null default false,
  closable          boolean not null default true,
  pausable          boolean not null default true,
  renewable         boolean not null default true,
  description       text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  check (available_until is null or available_from is null or available_until >= available_from)
);

create table public.quotation_templates (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  plan_id           uuid not null references public.plans on delete cascade,
  validity_days     int not null default 30 check (validity_days > 0),
  duration_periods  int check (duration_periods > 0),
  payment_terms     public.payment_terms not null default 'net_15',
  notes             text,
  created_at        timestamptz not null default now()
);

create table public.quotation_template_lines (
  id           uuid primary key default gen_random_uuid(),
  template_id  uuid not null references public.quotation_templates on delete cascade,
  product_id   uuid not null references public.products on delete cascade,
  variant_id   uuid references public.product_variants on delete set null,
  description  text,
  quantity     numeric(12,2) not null default 1 check (quantity > 0),
  unit_price   numeric(12,2) check (unit_price >= 0),
  position     int not null default 0
);

create table public.discounts (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  code          text unique,
  type          public.discount_type not null,
  value         numeric(12,2) not null check (value > 0),
  scope         public.discount_scope not null default 'products',
  min_purchase  numeric(12,2) not null default 0 check (min_purchase >= 0),
  min_quantity  numeric(12,2) not null default 0 check (min_quantity >= 0),
  starts_on     date,
  ends_on       date,
  usage_limit   int check (usage_limit > 0),
  times_used    int not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  check (type <> 'percent' or value <= 100),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.discount_products (
  discount_id  uuid not null references public.discounts on delete cascade,
  product_id   uuid not null references public.products on delete cascade,
  primary key (discount_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  number             text not null unique
                     default 'SUB-' || lpad(nextval('public.subscription_number_seq')::text, 5, '0'),
  customer_id        uuid not null references public.customers on delete restrict,
  plan_id            uuid not null references public.plans on delete restrict,
  template_id        uuid references public.quotation_templates on delete set null,
  status             public.subscription_status not null default 'draft',
  start_date         date not null default current_date,
  expiry_date        date,
  next_invoice_date  date,
  payment_terms      public.payment_terms not null default 'net_15',
  quote_valid_until  date,
  salesperson_id     uuid references public.profiles on delete set null,
  notes              text,
  paused_at          timestamptz,
  closed_at          timestamptz,
  close_reason       text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (expiry_date is null or expiry_date >= start_date)
);

create table public.subscription_lines (
  id               uuid primary key default gen_random_uuid(),
  subscription_id  uuid not null references public.subscriptions on delete cascade,
  product_id       uuid not null references public.products on delete restrict,
  variant_id       uuid references public.product_variants on delete set null,
  description      text,
  quantity         numeric(12,2) not null default 1 check (quantity > 0),
  unit_price       numeric(12,2) not null default 0 check (unit_price >= 0),
  tax_id           uuid references public.taxes on delete set null,
  amount           numeric(14,2) generated always as (round(quantity * unit_price, 2)) stored,
  position         int not null default 0
);

create table public.subscription_discounts (
  subscription_id  uuid not null references public.subscriptions on delete cascade,
  discount_id      uuid not null references public.discounts on delete cascade,
  created_at       timestamptz not null default now(),
  primary key (subscription_id, discount_id)
);

-- ---------------------------------------------------------------------------
-- Invoices and payments
-- ---------------------------------------------------------------------------
create table public.invoices (
  id               uuid primary key default gen_random_uuid(),
  number           text not null unique
                   default 'INV/' || to_char(current_date, 'YYYY') || '/' || lpad(nextval('public.invoice_number_seq')::text, 5, '0'),
  subscription_id  uuid references public.subscriptions on delete set null,
  customer_id      uuid not null references public.customers on delete restrict,
  discount_id      uuid references public.discounts on delete set null,
  status           public.invoice_status not null default 'draft',
  invoice_date     date not null default current_date,
  due_date         date not null default current_date,
  period_start     date,
  period_end       date,
  subtotal         numeric(14,2) not null default 0,
  discount_total   numeric(14,2) not null default 0,
  tax_total        numeric(14,2) not null default 0,
  total            numeric(14,2) not null default 0,
  amount_paid      numeric(14,2) not null default 0,
  confirmed_at     timestamptz,
  paid_at          timestamptz,
  cancelled_at     timestamptz,
  sent_at          timestamptz,
  notes            text,
  created_at       timestamptz not null default now()
);
-- One live invoice per subscription per billing period: the guard against double billing.
create unique index invoices_one_per_period
  on public.invoices (subscription_id, period_start)
  where status <> 'cancelled' and subscription_id is not null;

create table public.invoice_lines (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices on delete cascade,
  product_id       uuid references public.products on delete set null,
  discount_id      uuid references public.discounts on delete set null,
  description      text not null,
  quantity         numeric(12,2) not null default 1 check (quantity > 0),
  unit_price       numeric(12,2) not null default 0 check (unit_price >= 0),
  discount_amount  numeric(12,2) not null default 0 check (discount_amount >= 0),
  tax_rate         numeric(5,2) not null default 0,
  subtotal         numeric(14,2) generated always as (round(quantity * unit_price - discount_amount, 2)) stored,
  tax_amount       numeric(14,2) generated always as (round((quantity * unit_price - discount_amount) * tax_rate / 100, 2)) stored,
  total            numeric(14,2) generated always as (
                     round(quantity * unit_price - discount_amount, 2)
                     + round((quantity * unit_price - discount_amount) * tax_rate / 100, 2)) stored,
  position         int not null default 0,
  check (discount_amount <= quantity * unit_price)
);

create table public.payments (
  id                  uuid primary key default gen_random_uuid(),
  invoice_id          uuid not null references public.invoices on delete restrict,
  customer_id         uuid not null references public.customers on delete restrict,
  method              public.payment_method not null,
  amount              numeric(14,2) not null check (amount > 0),
  paid_on             date not null default current_date,
  note                text,
  reference           text,
  gateway_order_id    text,
  gateway_payment_id  text unique,
  recorded_by         uuid references public.profiles on delete set null,
  created_at          timestamptz not null default now()
);

create table public.activity_log (
  id           bigint generated always as identity primary key,
  entity       text not null,
  entity_id    uuid not null,
  action       text not null,
  from_status  text,
  to_status    text,
  message      text,
  actor_id     uuid default auth.uid() references public.profiles on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes for list pages and the billing run
-- ---------------------------------------------------------------------------
create index on public.subscriptions (customer_id);
create index on public.subscriptions (plan_id);
create index on public.subscriptions (status, created_at desc);
create index on public.subscriptions (next_invoice_date) where status = 'active';
create index on public.subscription_lines (subscription_id);
create index on public.invoices (customer_id);
create index on public.invoices (subscription_id);
create index on public.invoices (status, due_date);
create index on public.invoices (invoice_date desc);
create index on public.invoice_lines (invoice_id);
create index on public.payments (invoice_id);
create index on public.payments (customer_id);
create index on public.payments (paid_on desc);
create index on public.product_variants (product_id);
create index on public.activity_log (entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create function public.my_role() returns public.user_role
language sql stable security definer set search_path = ''
as $$ select role from public.profiles where id = auth.uid() $$;

create function public.is_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select role in ('admin', 'staff') from public.profiles where id = auth.uid()), false) $$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false) $$;

create function public.my_customer_id() returns uuid
language sql stable security definer set search_path = ''
as $$ select id from public.customers where user_id = auth.uid() $$;

create function public.period_interval(p public.billing_period, n int) returns interval
language sql immutable set search_path = ''
as $$
  select case p
    when 'daily'   then make_interval(days => n)
    when 'weekly'  then make_interval(weeks => n)
    when 'monthly' then make_interval(months => n)
    else make_interval(years => n)
  end
$$;

create function public.terms_days(t public.payment_terms) returns int
language sql immutable set search_path = ''
as $$
  select case t
    when 'immediate' then 0 when 'net_7' then 7 when 'net_15' then 15
    when 'net_30' then 30 when 'net_45' then 45 else 60
  end
$$;

-- Monthly-equivalent of one billing cycle's amount, for MRR.
create function public.monthly_factor(p public.billing_period, n int) returns numeric
language sql immutable set search_path = ''
as $$
  select case p
    when 'daily'   then 30.0 / n
    when 'weekly'  then (52.0 / 12) / n
    when 'monthly' then 1.0 / n
    else 1.0 / (12 * n)
  end
$$;

-- ---------------------------------------------------------------------------
-- New auth user -> profile (+ customer record for portal sign-ups).
-- Role comes from app_metadata, which only the service role can set.
-- ---------------------------------------------------------------------------
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_role public.user_role := coalesce((new.raw_app_meta_data ->> 'role')::public.user_role, 'customer');
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, role, full_name, email, phone)
  values (new.id, v_role, v_name, new.email, nullif(new.raw_user_meta_data ->> 'phone', ''));

  if v_role = 'customer' then
    -- Staff may have created the customer record before the person signed up.
    update public.customers set user_id = new.id
    where lower(email) = lower(new.email) and user_id is null;
    if not found then
      insert into public.customers (user_id, name, email, phone, company)
      values (new.id, v_name, new.email,
              nullif(new.raw_user_meta_data ->> 'phone', ''),
              nullif(new.raw_user_meta_data ->> 'company', ''));
    end if;
  end if;
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Subscription lifecycle
-- ---------------------------------------------------------------------------
create function public.check_subscription_transition() returns trigger
language plpgsql set search_path = ''
as $$
declare
  pl public.plans;
  v_qty numeric;
  ok boolean;
begin
  new.updated_at := now();
  if new.status = old.status then
    return new;
  end if;

  select * into pl from public.plans where id = new.plan_id;

  ok := case old.status
    when 'draft'     then new.status in ('quotation', 'confirmed', 'closed')
    when 'quotation' then new.status in ('draft', 'confirmed', 'closed')
    when 'confirmed' then new.status in ('active', 'closed')
    when 'active'    then new.status in ('paused', 'closed')
    when 'paused'    then new.status in ('active', 'closed')
    when 'closed'    then new.status = 'active'
  end;
  if not ok then
    raise exception 'A subscription cannot move from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  if new.status = 'quotation' and new.quote_valid_until is null then
    new.quote_valid_until := current_date + coalesce(
      (select validity_days from public.quotation_templates where id = new.template_id), 30);
  end if;

  if new.status = 'confirmed' then
    select coalesce(sum(quantity), 0) into v_qty
    from public.subscription_lines where subscription_id = new.id;
    if v_qty = 0 then
      raise exception 'Add at least one product line before confirming' using errcode = 'check_violation';
    end if;
    if v_qty < pl.min_quantity then
      raise exception 'Plan "%" needs a minimum quantity of %', pl.name, pl.min_quantity
        using errcode = 'check_violation';
    end if;
    if (pl.available_from is not null and current_date < pl.available_from)
       or (pl.available_until is not null and current_date > pl.available_until) then
      raise exception 'Plan "%" is not available today', pl.name using errcode = 'check_violation';
    end if;
  end if;

  if new.status = 'paused' then
    if not pl.pausable then
      raise exception 'Plan "%" does not allow pausing', pl.name using errcode = 'check_violation';
    end if;
    new.paused_at := now();
  end if;

  if new.status = 'closed' then
    if old.status in ('active', 'paused') and not pl.closable
       and (new.expiry_date is null or new.expiry_date > current_date) then
      raise exception 'Plan "%" cannot be closed before it ends', pl.name using errcode = 'check_violation';
    end if;
    new.closed_at := now();
  end if;

  if new.status = 'active' then
    if old.status = 'closed' and not pl.renewable then
      raise exception 'Plan "%" cannot be renewed', pl.name using errcode = 'check_violation';
    end if;
    if old.status = 'paused' then
      -- Paused time is not billed: resume from today.
      new.next_invoice_date := greatest(coalesce(old.next_invoice_date, current_date), current_date);
    else
      new.next_invoice_date := coalesce(new.next_invoice_date, new.start_date);
    end if;
    new.paused_at := null;
    new.closed_at := null;
    new.close_reason := null;
  end if;

  return new;
end
$$;

create trigger subscriptions_transition
  before update on public.subscriptions
  for each row execute function public.check_subscription_transition();

-- ---------------------------------------------------------------------------
-- Invoice lifecycle and totals
-- ---------------------------------------------------------------------------
create function public.check_invoice_transition() returns trigger
language plpgsql set search_path = ''
as $$
declare ok boolean;
begin
  if new.status = old.status then
    return new;
  end if;
  ok := case old.status
    when 'draft'     then new.status in ('confirmed', 'cancelled')
    when 'confirmed' then new.status in ('paid', 'cancelled')
    when 'paid'      then new.status = 'confirmed'
    else false
  end;
  if not ok then
    raise exception 'An invoice cannot move from % to %', old.status, new.status
      using errcode = 'check_violation';
  end if;
  if new.status = 'cancelled' and old.amount_paid > 0 then
    raise exception 'Refund the payments before cancelling this invoice' using errcode = 'check_violation';
  end if;
  if new.status = 'paid' and new.amount_paid < new.total then
    raise exception 'Invoice is not fully paid' using errcode = 'check_violation';
  end if;
  case new.status
    when 'confirmed' then new.confirmed_at := coalesce(new.confirmed_at, now());
    when 'paid'      then new.paid_at := now();
    when 'cancelled' then new.cancelled_at := now();
    else null;
  end case;
  return new;
end
$$;

create trigger invoices_transition
  before update on public.invoices
  for each row execute function public.check_invoice_transition();

create function public.guard_invoice_lines() returns trigger
language plpgsql set search_path = ''
as $$
declare v_status public.invoice_status;
begin
  select status into v_status from public.invoices
  where id = coalesce(new.invoice_id, old.invoice_id);
  if v_status is not null and v_status <> 'draft' then
    raise exception 'Only draft invoices can be edited' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end
$$;

create trigger invoice_lines_guard
  before insert or update or delete on public.invoice_lines
  for each row execute function public.guard_invoice_lines();

create function public.recompute_invoice_totals() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices i set
    subtotal       = t.subtotal,
    discount_total = t.discount_total,
    tax_total      = t.tax_total,
    total          = t.total
  from (
    select coalesce(sum(round(quantity * unit_price, 2)), 0) as subtotal,
           coalesce(sum(discount_amount), 0)                 as discount_total,
           coalesce(sum(tax_amount), 0)                      as tax_total,
           coalesce(sum(total), 0)                           as total
    from public.invoice_lines where invoice_id = v_id
  ) t
  where i.id = v_id;
  return null;
end
$$;

create trigger invoice_lines_totals
  after insert or update or delete on public.invoice_lines
  for each row execute function public.recompute_invoice_totals();

-- ---------------------------------------------------------------------------
-- Payments roll up into the invoice
-- ---------------------------------------------------------------------------
create function public.check_payment() returns trigger
language plpgsql set search_path = ''
as $$
declare inv public.invoices;
begin
  select * into inv from public.invoices where id = new.invoice_id for update;
  if inv.status <> 'confirmed' then
    raise exception 'Payments can only be recorded against confirmed invoices' using errcode = 'check_violation';
  end if;
  if new.amount > inv.total - inv.amount_paid then
    raise exception 'Payment of % exceeds the % still due', new.amount, inv.total - inv.amount_paid
      using errcode = 'check_violation';
  end if;
  new.customer_id := inv.customer_id;
  return new;
end
$$;

create trigger payments_check
  before insert on public.payments
  for each row execute function public.check_payment();

create function public.apply_payments() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid := coalesce(new.invoice_id, old.invoice_id);
begin
  update public.invoices i set
    amount_paid = p.paid,
    status = case
      when i.status = 'confirmed' and p.paid >= i.total then 'paid'::public.invoice_status
      when i.status = 'paid' and p.paid < i.total then 'confirmed'::public.invoice_status
      else i.status
    end
  from (select coalesce(sum(amount), 0) as paid from public.payments where invoice_id = v_id) p
  where i.id = v_id;
  return null;
end
$$;

create trigger payments_apply
  after insert or delete on public.payments
  for each row execute function public.apply_payments();

-- ---------------------------------------------------------------------------
-- Activity log (status timeline)
-- ---------------------------------------------------------------------------
create function public.log_status_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.activity_log (entity, entity_id, action, to_status)
    values (tg_table_name, new.id, 'created', new.status::text);
  elsif new.status is distinct from old.status then
    insert into public.activity_log (entity, entity_id, action, from_status, to_status)
    values (tg_table_name, new.id, 'status', old.status::text, new.status::text);
  end if;
  return null;
end
$$;

create trigger subscriptions_log after insert or update of status on public.subscriptions
  for each row execute function public.log_status_change();
create trigger invoices_log after insert or update of status on public.invoices
  for each row execute function public.log_status_change();

create function public.log_payment() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.activity_log (entity, entity_id, action, message)
  values ('invoices', new.invoice_id, 'payment',
          new.method::text || ' payment of ' || new.amount::text || ' recorded');
  return null;
end
$$;

create trigger payments_log after insert on public.payments
  for each row execute function public.log_payment();

-- ---------------------------------------------------------------------------
-- Billing run
-- ---------------------------------------------------------------------------
-- Creates every invoice a subscription owes up to p_as_of, one per billing
-- period, applying taxes and any discounts that are live on that date.
-- Safe to re-run: the unique (subscription_id, period_start) index means a
-- period that already has an invoice is skipped, never billed twice.
create function public.bill_subscription(p_subscription_id uuid, p_as_of date default current_date)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  s        public.subscriptions;
  pl       public.plans;
  v_start  date;
  v_end    date;
  v_inv    uuid;
  v_net    numeric;
  v_disc   public.discounts;
  v_amount numeric;
  v_before numeric;
  v_count  int := 0;
  v_guard  int := 0;
begin
  select * into s from public.subscriptions where id = p_subscription_id for update;
  if not found or s.status <> 'active' then
    return 0;
  end if;
  select * into pl from public.plans where id = s.plan_id;
  v_start := coalesce(s.next_invoice_date, s.start_date);

  while v_start <= p_as_of
        and (s.expiry_date is null or v_start <= s.expiry_date)
        and v_guard < 1000 loop
    v_guard := v_guard + 1;
    v_end := (v_start + public.period_interval(pl.billing_period, pl.billing_interval))::date - 1;
    v_inv := null;

    insert into public.invoices (subscription_id, customer_id, invoice_date, due_date, period_start, period_end)
    values (s.id, s.customer_id, v_start, v_start + public.terms_days(s.payment_terms), v_start, v_end)
    on conflict (subscription_id, period_start) where status <> 'cancelled' and subscription_id is not null
    do nothing
    returning id into v_inv;

    if v_inv is not null then
      -- Lines, each with the best product-level discount live on v_start.
      insert into public.invoice_lines
        (invoice_id, product_id, discount_id, description, quantity, unit_price, discount_amount, tax_rate, position)
      select v_inv, l.product_id, d.id,
             coalesce(nullif(l.description, ''), p.name || coalesce(' (' || v.value || ')', '')),
             l.quantity, l.unit_price, coalesce(d.amount, 0), coalesce(t.rate, 0), l.position
      from public.subscription_lines l
      join public.products p on p.id = l.product_id
      left join public.product_variants v on v.id = l.variant_id
      left join public.taxes t on t.id = coalesce(l.tax_id, p.tax_id)
      left join lateral (
        select dc.id,
               round(least(l.quantity * l.unit_price,
                 case dc.type when 'percent' then l.quantity * l.unit_price * dc.value / 100 else dc.value end), 2) as amount
        from public.discounts dc
        join public.discount_products dp on dp.discount_id = dc.id and dp.product_id = l.product_id
        where dc.scope = 'products' and dc.is_active
          and (dc.starts_on is null or dc.starts_on <= v_start)
          and (dc.ends_on is null or dc.ends_on >= v_start)
          and (dc.usage_limit is null or dc.times_used < dc.usage_limit)
          and l.quantity >= dc.min_quantity
          and l.quantity * l.unit_price >= dc.min_purchase
        order by 2 desc
        limit 1
      ) d on true
      where l.subscription_id = s.id;

      -- Best subscription-level discount, spread across lines by their share.
      select sum(quantity * unit_price - discount_amount) into v_net
      from public.invoice_lines where invoice_id = v_inv;

      select dc.* into v_disc
      from public.discounts dc
      join public.subscription_discounts sd on sd.discount_id = dc.id and sd.subscription_id = s.id
      where dc.scope = 'subscription' and dc.is_active
        and (dc.starts_on is null or dc.starts_on <= v_start)
        and (dc.ends_on is null or dc.ends_on >= v_start)
        and (dc.usage_limit is null or dc.times_used < dc.usage_limit)
        and coalesce(v_net, 0) >= dc.min_purchase
        and (select coalesce(sum(quantity), 0) from public.subscription_lines where subscription_id = s.id) >= dc.min_quantity
      order by case dc.type when 'percent' then v_net * dc.value / 100 else dc.value end desc
      limit 1;

      if v_disc.id is not null and v_net > 0 then
        v_amount := round(least(v_net,
          case v_disc.type when 'percent' then v_net * v_disc.value / 100 else v_disc.value end), 2);
        select sum(discount_amount) into v_before from public.invoice_lines where invoice_id = v_inv;
        update public.invoice_lines set
          discount_amount = discount_amount
            + round(v_amount * (quantity * unit_price - discount_amount) / v_net, 2)
        where invoice_id = v_inv;
        -- Put any rounding remainder on the largest line so the discount is exact.
        update public.invoice_lines set discount_amount = least(quantity * unit_price,
          discount_amount + v_amount
            - ((select sum(discount_amount) from public.invoice_lines where invoice_id = v_inv) - v_before))
        where id = (select id from public.invoice_lines where invoice_id = v_inv
                    order by quantity * unit_price - discount_amount desc limit 1);
        update public.invoices set discount_id = v_disc.id where id = v_inv;
        update public.discounts set times_used = times_used + 1 where id = v_disc.id;
      end if;

      update public.discounts set times_used = times_used + 1
      where id in (select distinct discount_id from public.invoice_lines
                   where invoice_id = v_inv and discount_id is not null);

      v_count := v_count + 1;
    end if;

    v_start := v_end + 1;
  end loop;

  update public.subscriptions set next_invoice_date = v_start where id = s.id;
  return v_count;
end
$$;
