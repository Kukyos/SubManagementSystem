# Brightloop

Plans, subscriptions and recurring billing in one place.

Built for the Odoo hackathon problem statement *Subscription Management
System*. This README is the project showcase once the screens land; for now
it is the setup reference. How we work is in
[`docs/HACKATHON_PLAN.md`](docs/HACKATHON_PLAN.md).

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Postgres,
Auth, row level security, pg_cron) · Vercel

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the Supabase keys
npm run dev
```

Schema and functions are in `supabase/migrations/`, described in
[`docs/SCHEMA.md`](docs/SCHEMA.md).
