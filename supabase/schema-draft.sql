-- DRAFT ONLY: not applied or runtime-connected. Review and integration-test RLS before deployment.
-- This variant assumes Supabase Auth. Existing Listed uses Firebase; make an explicit identity
-- migration/bridge decision before enabling this schema. Never treat UI mode as authorization.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  preferred_mode text not null default 'buyer' check (preferred_mode in ('buyer','seller')),
  created_at timestamptz not null default now()
);
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references public.profiles(id),
  status text not null default 'draft' check (status in ('draft','review','published','withdrawn')),
  source text not null check (source in ('sample','licensed','seller')),
  source_reference text,
  source_permission_reference text,
  facts jsonb not null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.buyer_preferences (
  buyer_id uuid primary key references public.profiles(id) on delete cascade,
  stated jsonb not null default '{}',
  learning_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.engagement_events (
  id uuid primary key,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  session_id uuid not null,
  kind text not null check (kind in ('impression','open','photo','like','unlike','save','unsave','share_intent','share_completed','hide','unhide','showing_requested')),
  metadata jsonb not null default '{}',
  received_at timestamptz not null default now(),
  verified boolean not null default false
);
create index engagement_property_time on public.engagement_events(property_id,received_at desc);
create index engagement_buyer_time on public.engagement_events(buyer_id,received_at desc);
create table public.saved_properties (
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(buyer_id,property_id)
);
-- Buyer and seller private preferences/negotiation context stay in separate owner-only tables.
-- Seller metrics must be thresholded aggregates; sellers must never read individual buyer events.
alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.buyer_preferences enable row level security;
alter table public.engagement_events enable row level security;
alter table public.saved_properties enable row level security;
create policy profile_owner on public.profiles for all to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy public_listings on public.properties for select using(status='published');
create policy seller_read on public.properties for select to authenticated using(seller_id=auth.uid());
-- Publishing requires a server-side review and source-permission check. Clients create only drafts.
create policy seller_create on public.properties for insert to authenticated with check(seller_id=auth.uid() and status='draft');
create policy seller_edit_draft on public.properties for update to authenticated using(seller_id=auth.uid() and status='draft') with check(seller_id=auth.uid() and status='draft');
create policy preference_owner on public.buyer_preferences for all to authenticated using(buyer_id=auth.uid()) with check(buyer_id=auth.uid());
create policy saved_owner on public.saved_properties for all to authenticated using(buyer_id=auth.uid()) with check(buyer_id=auth.uid());
create policy own_event_read on public.engagement_events for select to authenticated using(buyer_id=auth.uid());
-- No client insert/update policy for events. A rate-limited authenticated endpoint validates
-- property access, identity, idempotency, server timestamp and event kind, and writes via service role.
-- Verification is server-only; the client cannot submit verified=true or choose another buyer ID.
commit;
