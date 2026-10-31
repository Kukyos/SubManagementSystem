-- Nightly billing run at 00:30 UTC (06:00 IST).
create extension if not exists pg_cron;
select cron.schedule('nightly-billing', '30 0 * * *', $$select public.run_billing()$$);
