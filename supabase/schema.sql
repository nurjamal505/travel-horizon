-- Run in Supabase SQL Editor. Create an Auth user first, then insert that user's UUID into admins.
create extension if not exists pgcrypto;
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.bookings (
 id uuid primary key default gen_random_uuid(),
 name text not null, country text, email text, phone text, tour text, date date,
 travelers integer, budget text, language text, notes text,
 status text not null default 'new' check (status in ('new','contacted','confirmed','cancelled')),
 telegram_ref text, idempotency_key text unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.admins enable row level security;
alter table public.bookings enable row level security;
-- No public policies: browser clients cannot read or modify these tables.
-- The Vercel API checks the authenticated user against admins and uses the service role server-side.

-- Safe upgrade for projects that created the table before idempotency support.
alter table public.bookings add column if not exists idempotency_key text;
create unique index if not exists bookings_idempotency_key_uidx on public.bookings(idempotency_key) where idempotency_key is not null;
