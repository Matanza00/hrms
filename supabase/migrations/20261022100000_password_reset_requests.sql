-- ============================================================================
-- Password reset requests.
--
-- Employees can't set their own password. From the login page they ask for a
-- reset; the request shows up for admins, who set a new password on the
-- employee's login (which resolves the request) or dismiss it.
-- Safe to re-run.
-- ============================================================================

create table if not exists public.password_reset_requests (
  request_id   uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(employee_id) on delete cascade,
  status       text not null default 'Pending' check (status in ('Pending','Resolved','Dismissed')),
  requested_at timestamptz not null default now(),
  resolved_at  timestamptz,
  resolved_by  text
);

-- At most one open request per employee, so repeated clicks don't pile up.
create unique index if not exists password_reset_requests_pending_uq
  on public.password_reset_requests (employee_id) where status = 'Pending';

-- Only the API (service role) and admins touch this table.
alter table public.password_reset_requests enable row level security;
drop policy if exists password_reset_requests_admin on public.password_reset_requests;
create policy password_reset_requests_admin on public.password_reset_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
