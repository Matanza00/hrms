-- ============================================================================
-- Document review + separations (resignation / termination).
--
-- Documents: employees upload their own files; each one waits for an admin to
-- approve or reject it. Admin uploads are approved straight away.
--
-- Separations: an admin records a resignation or termination with a last
-- working day, or an employee hands in a resignation that an admin accepts.
-- Until the last working day the employee is on 'Notice Period' and keeps
-- their login; after it, the API finalizes the separation: the employee
-- becomes inactive ('Resigned' / 'Terminated') and their login is disabled.
-- Safe to re-run.
-- ============================================================================

-- --- Documents: review status ------------------------------------------------
-- Existing rows were all uploaded by admins, so they start Approved; new rows
-- default to Pending (the API sets the status explicitly either way).
alter table public.documents add column if not exists status text not null default 'Approved'
  check (status in ('Pending','Approved','Rejected'));
alter table public.documents alter column status set default 'Pending';
alter table public.documents add column if not exists review_note text;
alter table public.documents add column if not exists reviewed_by text;
alter table public.documents add column if not exists reviewed_at timestamptz;
create index if not exists documents_pending_idx on public.documents (created_at)
  where status = 'Pending';

-- --- Employment status: add Terminated --------------------------------------
alter table public.employees drop constraint if exists employees_status_check;
alter table public.employees add constraint employees_status_check
  check (status in ('Permanent','Contract','Intern','Probation','Notice Period','Resigned','Terminated'));

-- --- Separations --------------------------------------------------------------
create table if not exists public.separations (
  separation_id      uuid primary key default gen_random_uuid(),
  employee_id        uuid not null references public.employees(employee_id) on delete cascade,
  type               text not null check (type in ('Resignation','Termination')),
  -- Pending: employee handed in a resignation, waiting for an admin.
  -- Approved: accepted/recorded; serving notice until last_working_day.
  -- Completed: last working day has passed; employee deactivated.
  -- Rejected / Cancelled: closed without the employee leaving.
  status             text not null default 'Pending'
                       check (status in ('Pending','Approved','Rejected','Cancelled','Completed')),
  reason             text,
  notice_date        date not null,      -- day the resignation/termination was given
  requested_last_day date,               -- employee's proposed last day (resignations)
  last_working_day   date,               -- set when approved/recorded
  previous_status    text,               -- employment status to restore on cancel
  admin_note         text,
  created_by         text,
  created_at         timestamptz not null default now(),
  decided_by         text,
  decided_at         timestamptz,
  completed_at       timestamptz,
  check (status not in ('Approved','Completed') or last_working_day is not null)
);
create index if not exists separations_employee_idx on public.separations (employee_id, created_at desc);

-- One open separation per employee.
create unique index if not exists separations_open_uq
  on public.separations (employee_id) where status in ('Pending','Approved');

alter table public.separations enable row level security;
drop policy if exists separations_admin on public.separations;
create policy separations_admin on public.separations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Finalize every approved separation whose last working day is before
-- `p_today` (the API passes the current shift/business date, so a night shift
-- that runs past midnight on the last day is not cut off). Optionally limited
-- to one employee. Returns how many logins were disabled.
create or replace function public.finalize_due_separations(p_today date, p_employee uuid default null)
returns integer
language plpgsql
set search_path = public
as $$
declare
  n integer;
begin
  with due as (
    update public.separations s
       set status = 'Completed', completed_at = now()
     where s.status = 'Approved'
       and s.last_working_day < p_today
       and (p_employee is null or s.employee_id = p_employee)
    returning s.employee_id, s.type, s.last_working_day
  ), emp as (
    update public.employees e
       set active   = false,
           end_date = due.last_working_day,
           status   = case when due.type = 'Termination' then 'Terminated' else 'Resigned' end
      from due
     where e.employee_id = due.employee_id
    returning e.employee_id
  )
  update public.users u set active = false from emp where u.employee_id = emp.employee_id;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- Only the API (service role) calls it.
revoke execute on function public.finalize_due_separations(date, uuid) from public, anon, authenticated;
