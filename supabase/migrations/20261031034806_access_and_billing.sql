-- Row level security, grants, the scheduled billing run, the finance summary
-- and the customer self-service functions.

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.customers                enable row level security;
alter table public.taxes                    enable row level security;
alter table public.products                 enable row level security;
alter table public.product_variants         enable row level security;
alter table public.plans                    enable row level security;
alter table public.quotation_templates      enable row level security;
alter table public.quotation_template_lines enable row level security;
alter table public.discounts                enable row level security;
alter table public.discount_products        enable row level security;
alter table public.subscriptions            enable row level security;
alter table public.subscription_lines       enable row level security;
alter table public.subscription_discounts   enable row level security;
alter table public.invoices                 enable row level security;
alter table public.invoice_lines            enable row level security;
alter table public.payments                 enable row level security;
alter table public.activity_log             enable row level security;

-- profiles: everyone reads their own, staff read all. Role changes go through
-- the server with the service key, never through the client.
create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- customers
create policy customers_select on public.customers for select to authenticated
  using ((select public.is_staff()) or user_id = (select auth.uid()));
create policy customers_insert on public.customers for insert to authenticated
  with check ((select public.is_staff()));
create policy customers_update on public.customers for update to authenticated
  using ((select public.is_staff()) or user_id = (select auth.uid()))
  with check ((select public.is_staff()) or user_id = (select auth.uid()));
create policy customers_delete on public.customers for delete to authenticated
  using ((select public.is_admin()));

-- Catalogue every signed-in user may read; only the admin may change.
create policy taxes_select on public.taxes for select to authenticated using (true);
create policy taxes_write on public.taxes for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy products_select on public.products for select to authenticated using (true);
create policy products_write on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy product_variants_select on public.product_variants for select to authenticated using (true);
create policy product_variants_write on public.product_variants for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy plans_select on public.plans for select to authenticated using (true);
create policy plans_write on public.plans for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Internal catalogue: staff read, admin writes.
create policy quotation_templates_select on public.quotation_templates for select to authenticated
  using ((select public.is_staff()));
create policy quotation_templates_write on public.quotation_templates for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy quotation_template_lines_select on public.quotation_template_lines for select to authenticated
  using ((select public.is_staff()));
create policy quotation_template_lines_write on public.quotation_template_lines for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy discounts_select on public.discounts for select to authenticated
  using ((select public.is_staff()));
create policy discounts_write on public.discounts for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy discount_products_select on public.discount_products for select to authenticated
  using ((select public.is_staff()));
create policy discount_products_write on public.discount_products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- Subscriptions: staff work on all of them, customers read their own.
create policy subscriptions_select on public.subscriptions for select to authenticated
  using ((select public.is_staff()) or customer_id = (select public.my_customer_id()));
create policy subscriptions_insert on public.subscriptions for insert to authenticated
  with check ((select public.is_staff()));
create policy subscriptions_update on public.subscriptions for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy subscriptions_delete on public.subscriptions for delete to authenticated
  using ((select public.is_staff()) and status in ('draft', 'quotation'));

create policy subscription_lines_select on public.subscription_lines for select to authenticated
  using ((select public.is_staff()) or exists (
    select 1 from public.subscriptions s
    where s.id = subscription_id and s.customer_id = (select public.my_customer_id())));
create policy subscription_lines_write on public.subscription_lines for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

create policy subscription_discounts_select on public.subscription_discounts for select to authenticated
  using ((select public.is_staff()) or exists (
    select 1 from public.subscriptions s
    where s.id = subscription_id and s.customer_id = (select public.my_customer_id())));
create policy subscription_discounts_write on public.subscription_discounts for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Invoices
create policy invoices_select on public.invoices for select to authenticated
  using ((select public.is_staff()) or customer_id = (select public.my_customer_id()));
create policy invoices_insert on public.invoices for insert to authenticated
  with check ((select public.is_staff()));
create policy invoices_update on public.invoices for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy invoices_delete on public.invoices for delete to authenticated
  using ((select public.is_staff()) and status = 'draft');

create policy invoice_lines_select on public.invoice_lines for select to authenticated
  using ((select public.is_staff()) or exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.customer_id = (select public.my_customer_id())));
create policy invoice_lines_write on public.invoice_lines for all to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));

-- Payments: staff record them; customers' gateway payments are written by the
-- server after the gateway signature has been verified.
create policy payments_select on public.payments for select to authenticated
  using ((select public.is_staff()) or customer_id = (select public.my_customer_id()));
create policy payments_insert on public.payments for insert to authenticated
  with check ((select public.is_staff()));
create policy payments_delete on public.payments for delete to authenticated
  using ((select public.is_admin()));

create policy activity_log_select on public.activity_log for select to authenticated
  using ((select public.is_staff())
    or exists (select 1 from public.subscriptions s
               where s.id = entity_id and s.customer_id = (select public.my_customer_id()))
    or exists (select 1 from public.invoices i
               where i.id = entity_id and i.customer_id = (select public.my_customer_id())));

-- ---------------------------------------------------------------------------
-- Grants. Nothing is readable without signing in.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Column-level: a user can edit their own name and phone, never their role.
revoke update on public.profiles from authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

-- Link to an auth user is set by the sign-up trigger only.
revoke update on public.customers from authenticated;
grant update (name, email, phone, company, address, city, country, tax_number, notes)
  on public.customers to authenticated;

-- Cost price is internal. Customers can read the catalogue but not margins;
-- staff read cost through product_costs().
revoke select on public.products from authenticated;
grant select (id, name, type, sales_price, tax_id, notes, is_active, created_at)
  on public.products to authenticated;

-- Counters are maintained by the billing run.
revoke update on public.discounts from authenticated;
grant update (name, code, type, value, scope, min_purchase, min_quantity, starts_on, ends_on, usage_limit, is_active)
  on public.discounts to authenticated;

-- Invoice money columns are derived; staff change status, dates and notes only.
revoke update on public.invoices from authenticated;
grant update (status, invoice_date, due_date, notes, sent_at) on public.invoices to authenticated;

revoke execute on all functions in schema public from anon, authenticated, public;
grant execute on function
  public.my_role(), public.is_staff(), public.is_admin(), public.my_customer_id(),
  public.period_interval(public.billing_period, int), public.terms_days(public.payment_terms),
  public.monthly_factor(public.billing_period, int)
to authenticated;

-- ---------------------------------------------------------------------------
-- Billing run: every active subscription that is due gets its invoices, and
-- plans set to close on their own are closed once they expire. One failing
-- subscription is reported and skipped rather than aborting the whole run.
-- ---------------------------------------------------------------------------
create function public.run_billing(p_as_of date default current_date)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  r          record;
  v_invoices int := 0;
  v_billed   int := 0;
  v_closed   int := 0;
  v_failed   jsonb := '[]'::jsonb;
begin
  -- Signed-in staff, the service key, or pg_cron (no JWT at all).
  if not public.is_staff() and coalesce(auth.role(), 'cron') not in ('service_role', 'cron') then
    raise exception 'Only staff can run billing' using errcode = '42501';
  end if;
  if p_as_of > current_date then
    raise exception 'Billing cannot run ahead of today' using errcode = 'check_violation';
  end if;

  for r in
    select id, number from public.subscriptions
    where status = 'active' and coalesce(next_invoice_date, start_date) <= p_as_of
    order by next_invoice_date
  loop
    begin
      v_invoices := v_invoices + public.bill_subscription(r.id, p_as_of);
      v_billed := v_billed + 1;
    exception when others then
      v_failed := v_failed || jsonb_build_object('subscription', r.number, 'error', sqlerrm);
    end;
  end loop;

  with closed as (
    update public.subscriptions s
    set status = 'closed',
        close_reason = 'Plan ended on ' || to_char(s.expiry_date, 'DD Mon YYYY')
    from public.plans p
    where p.id = s.plan_id and p.auto_close
      and s.status in ('active', 'paused')
      and s.expiry_date < p_as_of
    returning s.id
  )
  select count(*) into v_closed from closed;

  return jsonb_build_object(
    'as_of', p_as_of,
    'subscriptions_billed', v_billed,
    'invoices_created', v_invoices,
    'subscriptions_closed', v_closed,
    'failed', v_failed);
end
$$;

grant execute on function public.run_billing(date) to authenticated;

-- Staff action: bill one subscription now (used right after activation).
create function public.bill_now(p_subscription_id uuid)
returns int
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can bill a subscription' using errcode = '42501';
  end if;
  return public.bill_subscription(p_subscription_id, current_date);
end
$$;

grant execute on function public.bill_now(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Finance summary for the dashboard. Runs with the caller's rights, so RLS
-- decides what is counted.
-- ---------------------------------------------------------------------------
create function public.finance_summary(p_from date default null, p_to date default null)
returns jsonb
language sql stable set search_path = ''
as $$
  with bounds as (
    select coalesce(p_from, date_trunc('month', current_date)::date) as d_from,
           coalesce(p_to, current_date) as d_to
  ),
  active_subs as (
    select s.id, s.plan_id, pl.name as plan_name,
           coalesce(sum(l.amount), 0) * public.monthly_factor(pl.billing_period, pl.billing_interval) as mrr
    from public.subscriptions s
    join public.plans pl on pl.id = s.plan_id
    left join public.subscription_lines l on l.subscription_id = s.id
    where s.status = 'active'
    group by s.id, pl.id
  ),
  months as (
    select generate_series(date_trunc('month', current_date) - interval '11 months',
                           date_trunc('month', current_date), interval '1 month')::date as m
  )
  select jsonb_build_object(
    'from', (select d_from from bounds),
    'to', (select d_to from bounds),
    'active_subscriptions', (select count(*) from active_subs),
    'mrr', (select round(coalesce(sum(mrr), 0), 2) from active_subs),
    'collected', (select coalesce(sum(amount), 0) from public.payments, bounds
                  where paid_on between d_from and d_to),
    'invoiced', (select coalesce(sum(total), 0) from public.invoices, bounds
                 where status in ('confirmed', 'paid') and invoice_date between d_from and d_to),
    'outstanding', (select coalesce(sum(total - amount_paid), 0) from public.invoices
                    where status = 'confirmed'),
    'overdue_count', (select count(*) from public.invoices
                      where status = 'confirmed' and due_date < current_date),
    'overdue_amount', (select coalesce(sum(total - amount_paid), 0) from public.invoices
                       where status = 'confirmed' and due_date < current_date),
    'draft_invoices', (select count(*) from public.invoices where status = 'draft'),
    'subscriptions_by_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                                from (select status, count(*) n from public.subscriptions group by status) x),
    'monthly', (select jsonb_agg(jsonb_build_object(
                  'month', to_char(m, 'YYYY-MM'),
                  'invoiced', (select coalesce(sum(total), 0) from public.invoices
                               where status in ('confirmed', 'paid')
                                 and invoice_date >= m and invoice_date < m + interval '1 month'),
                  'collected', (select coalesce(sum(amount), 0) from public.payments
                                where paid_on >= m and paid_on < m + interval '1 month'),
                  'new_subscriptions', (select count(*) from public.subscriptions
                                        where created_at >= m and created_at < m + interval '1 month'),
                  'closed_subscriptions', (select count(*) from public.subscriptions
                                           where closed_at >= m and closed_at < m + interval '1 month'))
                order by m) from months),
    'top_plans', (select coalesce(jsonb_agg(x order by x.mrr desc), '[]'::jsonb) from (
                    select plan_name as name, count(*) as subscriptions, round(sum(mrr), 2) as mrr
                    from active_subs group by plan_name order by sum(mrr) desc limit 5) x)
  )
$$;

grant execute on function public.finance_summary(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- Customer self-service
-- ---------------------------------------------------------------------------
-- Pause, resume or cancel one of your own subscriptions. The lifecycle
-- trigger still applies the plan's rules.
create function public.portal_subscription_action(p_subscription_id uuid, p_action text)
returns public.subscription_status
language plpgsql security definer set search_path = ''
as $$
declare
  v_customer uuid := public.my_customer_id();
  v_status   public.subscription_status;
begin
  if v_customer is null then
    raise exception 'No customer account' using errcode = '42501';
  end if;
  perform 1 from public.subscriptions
  where id = p_subscription_id and customer_id = v_customer for update;
  if not found then
    raise exception 'Subscription not found' using errcode = 'no_data_found';
  end if;

  update public.subscriptions set
    status = case p_action
      when 'pause'  then 'paused'::public.subscription_status
      when 'resume' then 'active'::public.subscription_status
      when 'cancel' then 'closed'::public.subscription_status
    end,
    close_reason = case when p_action = 'cancel' then 'Cancelled by customer' else close_reason end
  where id = p_subscription_id
  returning status into v_status;

  if v_status is null then
    raise exception 'Unknown action %', p_action using errcode = 'invalid_parameter_value';
  end if;
  return v_status;
end
$$;

grant execute on function public.portal_subscription_action(uuid, text) to authenticated;

-- Subscribe to a plan from the portal: creates an active subscription with
-- immediate payment terms and its first, confirmed invoice ready to pay.
create function public.portal_subscribe(p_plan_id uuid, p_quantity int default 1, p_variant_id uuid default null)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_customer uuid := public.my_customer_id();
  pl         public.plans;
  v_extra    numeric := 0;
  v_sub      uuid;
  v_invoice  uuid;
begin
  if v_customer is null then
    raise exception 'No customer account' using errcode = '42501';
  end if;
  select * into pl from public.plans where id = p_plan_id and is_active;
  if not found or pl.product_id is null then
    raise exception 'This plan is not open for sign-up' using errcode = 'check_violation';
  end if;
  if p_quantity < pl.min_quantity then
    raise exception 'This plan needs at least % seats', pl.min_quantity using errcode = 'check_violation';
  end if;
  if p_variant_id is not null then
    select extra_price into v_extra from public.product_variants
    where id = p_variant_id and product_id = pl.product_id;
    if not found then
      raise exception 'That option does not belong to this plan' using errcode = 'check_violation';
    end if;
  end if;

  insert into public.subscriptions (customer_id, plan_id, status, start_date, payment_terms)
  values (v_customer, pl.id, 'draft', current_date, 'immediate')
  returning id into v_sub;

  insert into public.subscription_lines (subscription_id, product_id, variant_id, quantity, unit_price)
  values (v_sub, pl.product_id, p_variant_id, p_quantity, pl.price + coalesce(v_extra, 0));

  update public.subscriptions set status = 'confirmed' where id = v_sub;
  update public.subscriptions set status = 'active' where id = v_sub;
  perform public.bill_subscription(v_sub, current_date);

  select id into v_invoice from public.invoices
  where subscription_id = v_sub order by period_start limit 1;
  update public.invoices set status = 'confirmed' where id = v_invoice;
  return v_invoice;
end
$$;

grant execute on function public.portal_subscribe(uuid, int, uuid) to authenticated;

create function public.product_costs()
returns table (product_id uuid, cost_price numeric)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff can see cost prices' using errcode = '42501';
  end if;
  return query select p.id, p.cost_price from public.products p;
end
$$;

grant execute on function public.product_costs() to authenticated;

-- Functions created above picked up the default grant to anon; take it back,
-- and stop future functions from getting it.
revoke execute on all functions in schema public from anon, public;
alter default privileges in schema public revoke execute on functions from anon, public;
