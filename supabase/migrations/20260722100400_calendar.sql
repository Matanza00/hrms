-- ============================================================================
-- Holidays + special working days (calendar)
-- ============================================================================

create table public.holidays (
  holiday_id        uuid primary key default gen_random_uuid(),
  title             text not null,
  holiday_date      date not null,
  holiday_type      text not null default 'Public',  -- Public | Religious | Company
  calendar_event_id text,
  created_at        timestamptz not null default now()
);
create index holidays_date_idx on public.holidays (holiday_date);

create table public.special_working_days (
  working_day_id        uuid primary key default gen_random_uuid(),
  title                 text not null,
  working_date          date not null,
  all_employees         boolean not null default false,
  -- Comma-separated employee_ids, matching the legacy sheet model. When
  -- all_employees is true this is ignored.
  assigned_employee_ids text,
  calendar_event_id     text,
  created_at            timestamptz not null default now()
);
create index special_days_date_idx on public.special_working_days (working_date);
