-- ============================================================================
-- Registered attendance devices (QR check-in)
-- ----------------------------------------------------------------------------
-- Staff mark attendance by scanning the office QR poster with their phone. The
-- FIRST phone an employee scans with becomes their registered device: the
-- browser keeps a random token and this table binds it to the employee. Any
-- other phone is refused until an admin resets the registration (lost/new
-- phone), which is what stops one person marking attendance for another.
-- ============================================================================

create table public.employee_devices (
  device_id     uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(employee_id) on delete cascade,
  -- Random secret generated in the phone's browser; never shown to anyone.
  device_token  text not null unique,
  label         text,                       -- e.g. "Android · Chrome", for the admin list
  active        boolean not null default true,
  registered_at timestamptz not null default now(),
  last_seen_at  timestamptz,
  revoked_at    timestamptz,
  updated_at    timestamptz not null default now()
);

-- One ACTIVE device per employee. Revoked rows stay behind as history.
create unique index employee_devices_one_active
  on public.employee_devices (employee_id) where active;
create index employee_devices_employee_idx on public.employee_devices (employee_id);

create trigger employee_devices_touch before update on public.employee_devices
  for each row execute function public.set_updated_at();

-- Same defence-in-depth as the other tables: the Edge Function uses the
-- service role, these policies only matter if PostgREST is hit directly.
alter table public.employee_devices enable row level security;
create policy devices_admin on public.employee_devices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy devices_self on public.employee_devices for select to authenticated
  using (employee_id = public.current_employee_id());

-- The code printed on the office poster. Rotating it (admin action) retires
-- every printed copy at once.
insert into public.settings (key, value)
values ('attendanceQrCode', encode(extensions.gen_random_bytes(16), 'hex'))
on conflict (key) do nothing;
