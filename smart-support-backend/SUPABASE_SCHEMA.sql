-- Customers table stores the entire profile JSON (preferences, history, etc.)
create table if not exists public.customers (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Orders table stores order details along with customer reference
create table if not exists public.orders (
  id text primary key,
  customer_id text references public.customers (id) on delete set null,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- Change log for bot/human edits with raw payload
create table if not exists public.changes (
  change_id text primary key,
  entity_type text not null,
  entity_id text not null,
  status text not null,
  made_by text,
  agent_id text,
  reason text,
  data jsonb,
  created_at timestamptz default now(),
  applied_at timestamptz,
  rolled_back_at timestamptz,
  rollback_reason text
);

-- Escalations table keeps track of every human hand-off + email status
create table if not exists public.escalations (
  escalation_id text primary key,
  customer_id text references public.customers (id) on delete set null,
  status text not null,
  severity text,
  email_sent boolean default false,
  email_result jsonb,
  data jsonb,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists idx_orders_customer_id on public.orders (customer_id);
create index if not exists idx_changes_entity on public.changes (entity_type, entity_id);
create index if not exists idx_escalations_customer on public.escalations (customer_id);

-- Agent events capture each decision cycle (intent/sentiment/tasks)
create table if not exists public.agent_events (
  event_id uuid primary key,
  customer_id text references public.customers (id) on delete set null,
  agent_id text,
  channel_name text,
  intent text,
  sentiment_label text,
  sentiment_score numeric,
  urgency text,
  tasks jsonb,
  payload jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_agent_events_customer on public.agent_events (customer_id);
create index if not exists idx_agent_events_agent on public.agent_events (agent_id);
