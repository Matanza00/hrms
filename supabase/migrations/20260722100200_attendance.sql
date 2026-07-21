-- ============================================================================
-- Attendance + correction requests
-- ============================================================================

create table public.attendance (
  attendance_id     uuid primary key default gen_random_uuid(),
  employee_id       uuid not null references public.employees(employee_id) on delete cascade,
  -- BUSINESS date of the shift (Asia/Karachi, noon rollover). A 2 AM check-out
  -- keeps the same business date as its 8 PM check-in. See _shared/businessDate.ts.
  attendance_date   date not null,
  check_in          timestamptz,
  check_out         timestamptz,
  break_start       timestamptz,
  break_end         timestamptz,
  late_minutes      integer not null default 0,
  break_minutes     integer not null default 0,
  working_minutes   integer not null default 0,
  deficit_minutes   integer not null default 0,
  is_late           boolean not null default false,
  latitude          numeric,
  longitude         numeric,
  ip_address        text,
  attendance_status text not null default 'Present',
  remarks           text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- One attendance row per employee per shift/business-date. This is the DB-level
  -- guarantee behind "Already checked in for this shift".
  unique (employee_id, attendance_date)
);
create index attendance_employee_date_idx on public.attendance (employee_id, attendance_date desc);
create index attendance_date_idx          on public.attendance (attendance_date desc);
create trigger attendance_touch before update on public.attendance
  for each row execute function public.set_updated_at();

create table public.attendance_corrections (
  correction_id   uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references public.employees(employee_id) on delete cascade,
  attendance_date date not null,
  request_type    text not null,        -- e.g. 'checkIn' | 'checkOut' | 'break' | 'status'
  old_value       text,
  new_value       text not null,
  reason          text not null,
  status          text not null default 'Pending' check (status in ('Pending','Approved','Rejected')),
  approved_by     text,
  approved_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index corrections_employee_idx on public.attendance_corrections (employee_id, created_at desc);
create index corrections_status_idx   on public.attendance_corrections (status);
create trigger corrections_touch before update on public.attendance_corrections
  for each row execute function public.set_updated_at();
