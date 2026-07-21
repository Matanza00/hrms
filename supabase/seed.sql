-- Local-dev seed data (runs on `supabase db reset`). Safe demo rows only.
-- Real employees come from scripts/import-employees.mjs; the first admin login
-- is created by scripts/bootstrap-admin.mjs (needs the Auth API, not raw SQL).

insert into public.employees
  (employee_code, name, email, department, designation, status, basic_salary, fuel_allowance, opd_allowance, joining_date)
values
  ('LDS-001', 'Ayesha Khan',    'ayesha@legitdesign.studio',  'Design',     'Senior Designer', 'Permanent', 180000, 15000, 5000, '2023-01-10'),
  ('LDS-002', 'Imran Yousaf',   'imran@legitdesign.studio',   'Development', 'Frontend Dev',    'Permanent', 160000, 12000, 5000, '2023-03-01'),
  ('LDS-003', 'Mahnoor Sheikh', 'mahnoor@legitdesign.studio', 'Marketing',  'Content Lead',    'Contract',  120000, 10000, 5000, '2024-06-15')
on conflict (employee_code) do nothing;

insert into public.holidays (title, holiday_date, holiday_type) values
  ('Independence Day', '2026-08-14', 'Public'),
  ('Eid Milad-un-Nabi','2026-08-26', 'Religious')
on conflict do nothing;
