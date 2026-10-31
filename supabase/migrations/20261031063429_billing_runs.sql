-- Every billing run, from the console or the nightly job, leaves a row here
-- so the billing page can show what each run did.
create table public.billing_runs (
  id                   uuid primary key default gen_random_uuid(),
  as_of                date not null,
  ran_by               uuid references public.profiles on delete set null,
  subscriptions_billed int not null default 0,
  invoices_created     int not null default 0,
  subscriptions_closed int not null default 0,
  failed               jsonb not null default '[]'::jsonb,
  duration_ms          int not null default 0,
  created_at           timestamptz not null default now()
);
create index billing_runs_created_at on public.billing_runs (created_at desc);

alter table public.billing_runs enable row level security;
create policy billing_runs_select on public.billing_runs for select to authenticated
  using ((select public.is_staff()));
-- Written only by run_billing (security definer); nobody writes it directly.
revoke all on public.billing_runs from anon;
revoke insert, update, delete on public.billing_runs from authenticated;
grant select on public.billing_runs to authenticated;

create or replace function public.run_billing(p_as_of date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r          record;
  v_invoices int := 0;
  v_billed   int := 0;
  v_closed   int := 0;
  v_failed   jsonb := '[]'::jsonb;
  v_started  timestamptz := clock_timestamp();
  v_run      uuid;
begin
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
      v_failed := v_failed || jsonb_build_object('subscription', r.number, 'id', r.id, 'error', sqlerrm);
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

  insert into public.billing_runs (as_of, ran_by, subscriptions_billed, invoices_created, subscriptions_closed, failed, duration_ms)
  values (p_as_of, auth.uid(), v_billed, v_invoices, v_closed, v_failed,
          (extract(epoch from clock_timestamp() - v_started) * 1000)::int)
  returning id into v_run;

  return jsonb_build_object(
    'run_id', v_run,
    'as_of', p_as_of,
    'subscriptions_billed', v_billed,
    'invoices_created', v_invoices,
    'subscriptions_closed', v_closed,
    'failed', v_failed);
end
$$;
