-- ============================================================================
-- Leave requests
-- ============================================================================

create table public.leaves (
  leave_id     uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(employee_id) on delete cascade,
  leave_type   text not null,       -- 'Annual' | 'Casual' | 'Sick' | 'Unpaid' | ...
  start_date   date not null,
  end_date     date not null,
  total_days   numeric(6,2) not null default 0,
  paid_days    numeric(6,2),
  unpaid_days  numeric(6,2),
  reason       text,
  status       text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  approved_by  text,
  approved_at  timestamptz,
  comments     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date >= start_date)
);
create index leaves_employee_idx on public.leaves (employee_id, start_date desc);
create index leaves_status_idx   on public.leaves (status);
create trigger leaves_touch before update on public.leaves
  for each row execute function public.set_updated_at();
