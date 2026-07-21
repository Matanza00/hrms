-- ============================================================================
-- Core: settings, employees, users (auth profile)
-- ============================================================================

-- Key/value settings (mirrors the "Settings" sheet). The API assembles these
-- rows into the flat map the frontend expects: { key: value, ... }.
create table public.settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);
create trigger settings_touch before update on public.settings
  for each row execute function public.set_updated_at();

-- Employees (mirrors the "Employees" sheet).
create table public.employees (
  employee_id       uuid primary key default gen_random_uuid(),
  employee_code     text not null unique,
  name              text not null,
  email             text,
  phone             text,
  cnic              text,
  dob               date,
  joining_date      date,
  permanent_date    date,
  end_date          date,
  status            text check (status in ('Permanent','Contract','Intern','Probation')),
  department        text,
  designation       text,
  basic_salary      numeric(12,2) not null default 0,
  fuel_allowance    numeric(12,2) not null default 0,
  opd_allowance     numeric(12,2) not null default 0,
  address           text,
  emergency_contact text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index employees_active_idx on public.employees (active);
create index employees_code_idx   on public.employees (employee_code);
create trigger employees_touch before update on public.employees
  for each row execute function public.set_updated_at();

-- Auth profile: links a Supabase Auth user (auth.users) to an employee + role.
-- Employees log in with `username` (their employee code or a chosen username);
-- the API resolves that to the Auth account behind the scenes.
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  role         text not null default 'Employee' check (role in ('Admin','Employee')),
  employee_id  uuid references public.employees(employee_id) on delete set null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index users_employee_idx on public.users (employee_id);
create trigger users_touch before update on public.users
  for each row execute function public.set_updated_at();

-- Helper: role of the currently-authenticated caller (used by RLS policies).
create or replace function public.current_role_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- Helper: employee_id of the currently-authenticated caller.
create or replace function public.current_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select employee_id from public.users where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role_name() = 'Admin', false);
$$;
