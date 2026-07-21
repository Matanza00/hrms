-- ============================================================================
-- Accounts: revenue, expenses, reserve ledger, profit-distribution config
-- ============================================================================

create table public.revenue (
  revenue_id   uuid primary key default gen_random_uuid(),
  revenue_date date not null,
  amount       numeric(14,2) not null default 0,
  category     text,
  client       text,
  source       text,
  description  text,
  status       text default 'Received',
  created_by   text,
  created_at   timestamptz not null default now()
);
create index revenue_date_idx on public.revenue (revenue_date desc);

create table public.expenses (
  expense_id   uuid primary key default gen_random_uuid(),
  expense_date date not null,
  amount       numeric(14,2) not null default 0,
  category     text not null,   -- Salary | Utilities | Tools | Emergency | Misc | Reserve | ...
  description  text,
  created_by   text,
  created_at   timestamptz not null default now()
);
create index expenses_date_idx on public.expenses (expense_date desc);

-- Append-only ledger. balance_after is a running balance maintained by the API
-- inside a transaction so concurrent writes stay consistent.
create table public.reserve_ledger (
  reserve_id       uuid primary key default gen_random_uuid(),
  transaction_date date not null default current_date,
  transaction_type text not null check (transaction_type in ('Credit','Debit')),
  amount           numeric(14,2) not null,
  balance_after    numeric(14,2) not null,
  description      text,
  created_at       timestamptz not null default now()
);
create index reserve_created_idx on public.reserve_ledger (created_at);

-- Profit-distribution shares (name + percent). accountsOverview multiplies each
-- percent by net profit to produce the distribution amounts.
create table public.profit_distribution (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  percent    numeric(6,2) not null default 0,
  sort_order integer not null default 0
);
