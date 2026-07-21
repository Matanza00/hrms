-- ============================================================================
-- Row-Level Security
-- ----------------------------------------------------------------------------
-- The Edge Function talks to the DB with the service-role key, which BYPASSES
-- RLS -- it is the primary authorization gate (it checks role per action, the
-- way the old Apps Script did). These policies are defense-in-depth: if anyone
-- ever hits PostgREST directly with a user JWT, they still only see what they
-- should. `authenticated` = any logged-in user; `service_role` bypasses all.
-- ============================================================================

alter table public.settings              enable row level security;
alter table public.employees             enable row level security;
alter table public.users                 enable row level security;
alter table public.attendance            enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.leaves                enable row level security;
alter table public.holidays              enable row level security;
alter table public.special_working_days  enable row level security;
alter table public.payroll               enable row level security;
alter table public.revenue               enable row level security;
alter table public.expenses              enable row level security;
alter table public.reserve_ledger        enable row level security;
alter table public.profit_distribution   enable row level security;
alter table public.feedback              enable row level security;

-- ---- Reference data everyone may read; only admins may write --------------
create policy settings_read   on public.settings for select to authenticated using (true);
create policy settings_write  on public.settings for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy holidays_read   on public.holidays for select to authenticated using (true);
create policy holidays_write  on public.holidays for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy swd_read        on public.special_working_days for select to authenticated using (true);
create policy swd_write       on public.special_working_days for all    to authenticated using (public.is_admin()) with check (public.is_admin());

create policy pd_read         on public.profit_distribution for select to authenticated using (true);
create policy pd_write        on public.profit_distribution for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- Employees: admins all; employee sees only their own record ----------
create policy employees_admin on public.employees for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy employees_self  on public.employees for select to authenticated
  using (employee_id = public.current_employee_id());

-- ---- Users (auth profile): admins all; user sees own row ------------------
create policy users_admin on public.users for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy users_self  on public.users for select to authenticated
  using (id = auth.uid());

-- ---- Attendance: admins all; employee sees own -----------------------------
create policy attendance_admin on public.attendance for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy attendance_self  on public.attendance for select to authenticated
  using (employee_id = public.current_employee_id());

-- ---- Corrections: admins all; employee reads + files own -------------------
create policy corr_admin on public.attendance_corrections for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy corr_self_read on public.attendance_corrections for select to authenticated
  using (employee_id = public.current_employee_id());
create policy corr_self_insert on public.attendance_corrections for insert to authenticated
  with check (employee_id = public.current_employee_id());

-- ---- Leaves: admins all; employee reads + applies own ----------------------
create policy leaves_admin on public.leaves for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy leaves_self_read on public.leaves for select to authenticated
  using (employee_id = public.current_employee_id());
create policy leaves_self_insert on public.leaves for insert to authenticated
  with check (employee_id = public.current_employee_id());

-- ---- Payroll: admins all; employee reads own payslips ----------------------
create policy payroll_admin on public.payroll for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy payroll_self on public.payroll for select to authenticated
  using (employee_id = public.current_employee_id());

-- ---- Accounts: admin only --------------------------------------------------
create policy revenue_admin on public.revenue        for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy expenses_admin on public.expenses      for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy reserve_admin  on public.reserve_ledger for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- Feedback: anyone logged-in can file; only admins read/triage ----------
create policy feedback_insert on public.feedback for insert to authenticated with check (true);
create policy feedback_admin  on public.feedback for all    to authenticated using (public.is_admin()) with check (public.is_admin());
