-- ============================================================================
-- Default settings + profit-distribution shares.
-- Idempotent: inserts once, never overwrites values an admin later changes.
-- ============================================================================

insert into public.settings (key, value) values
  -- Shift / time (night shift 18:00 -> 03:00, Asia/Karachi)
  ('timezone',             'Asia/Karachi'),
  ('shiftStartTime',       '18:00'),
  ('shiftEndTime',         '03:00'),
  ('officeStartTime',      '18:00'),   -- lateness is measured against this
  ('graceMinutes',         '15'),
  ('requiredHours',        '8'),
  ('dayRolloverHour',      '12'),       -- business-day cutoff (noon)

  -- Weekend
  ('saturdayOff',          'TRUE'),
  ('sundayOff',            'TRUE'),

  -- Leave quotas (per year)
  ('annualLeave',          '14'),
  ('casualLeave',          '10'),
  ('sickLeave',            '8'),

  -- Geofencing (off by default; fail-open on misconfig)
  ('geofencingEnabled',    'FALSE'),
  ('officeLatitude',       ''),
  ('officeLongitude',      ''),
  ('officeRadiusMeters',   '200'),
  ('geofenceBufferMeters', '50'),

  -- Payroll knobs (see handlers/payroll.ts — reverse-engineered, verify these)
  ('workingDaysPerMonth',  '26'),       -- divisor for per-day salary
  ('lateDeductionPolicy',  '3late=1day'),
  ('sandwichPolicy',       'TRUE')
on conflict (key) do nothing;

insert into public.profit_distribution (name, percent, sort_order) values
  ('Reinvestment', 30, 1),
  ('Partners',     50, 2),
  ('Reserve',      20, 3)
on conflict do nothing;
