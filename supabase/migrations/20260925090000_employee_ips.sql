-- ============================================================================
-- Per-employee allowed networks (desktop attendance)
-- ----------------------------------------------------------------------------
-- A desktop has no GPS, so the browser falls back to a network guess that can
-- be a kilometre or more out and the office geofence refuses it. Registering
-- the public IP an employee's computer comes from gives a second way to prove
-- presence: attendance is allowed when the position is inside the office
-- radius OR the request arrives from one of that employee's registered IPs.
--
-- Note: only the PUBLIC address is visible to the server. Desktops behind one
-- office router share it, so in most offices this proves "on the office
-- network" rather than "this particular machine".
-- ============================================================================

create table public.employee_ips (
  ip_id       uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(employee_id) on delete cascade,
  ip_address  text not null,
  label       text,                        -- e.g. "Reception PC", "Office wifi"
  created_at  timestamptz not null default now(),
  last_used_at timestamptz,
  unique (employee_id, ip_address)
);

create index employee_ips_employee_idx on public.employee_ips (employee_id);
create index employee_ips_address_idx on public.employee_ips (ip_address);

-- Same posture as the other tables: the Edge Function uses the service role,
-- so these policies only matter if PostgREST is reached directly.
alter table public.employee_ips enable row level security;
create policy employee_ips_admin on public.employee_ips for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy employee_ips_self on public.employee_ips for select to authenticated
  using (employee_id = public.current_employee_id());
