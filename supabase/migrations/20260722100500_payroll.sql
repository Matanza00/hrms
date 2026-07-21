-- ============================================================================
-- Payroll (one row per employee per month, e.g. month = '2026-07')
-- ============================================================================

create table public.payroll (
  payroll_id           uuid primary key default gen_random_uuid(),
  employee_id          uuid not null references public.employees(employee_id) on delete cascade,
  month                text not null,             -- 'YYYY-MM'

  basic_salary         numeric(12,2) not null default 0,
  fuel_allowance       numeric(12,2) not null default 0,
  opd_allowance        numeric(12,2) not null default 0,
  gross_salary         numeric(12,2) not null default 0,

  unpaid_leave_days    numeric(6,2)  not null default 0,
  late_full_days       numeric(6,2)  not null default 0,
  late_half_days       numeric(6,2)  not null default 0,
  deficit_full_days    numeric(6,2)  not null default 0,
  deficit_half_days    numeric(6,2)  not null default 0,
  sandwich_days        numeric(6,2)  not null default 0,

  total_deduction_days numeric(6,2)  not null default 0,
  deduction_amount     numeric(12,2) not null default 0,

  bonus                numeric(12,2) not null default 0,
  net_salary           numeric(12,2) not null default 0,

  status               text not null default 'Generated' check (status in ('Generated','Paid','Cancelled')),
  generated_at         timestamptz not null default now(),
  paid_at              timestamptz,

  unique (employee_id, month)
);
create index payroll_month_idx    on public.payroll (month);
create index payroll_employee_idx on public.payroll (employee_id, month desc);
