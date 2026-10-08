-- ============================================================================
-- Admin edits, recurring expenses, revenue status, half-day rule, holiday seed.
--
-- Covers the follow-up requests:
--   * Profit distribution is now Partners 60 / Reserve 30 / Sadqah 10.
--   * New revenue starts as "Pending" (admins mark it "Received" from the table).
--   * Recurring expenses: a template that auto-posts one expense per month.
--   * Half-day cutoff setting (check-ins after this time count as a half day).
--   * A starter set of Pakistan public holidays for 2026.
-- Idempotent where it can be, so re-running `supabase db push` is safe.
-- ============================================================================

-- --- Profit distribution: Partners 60 / Reserve 30 / Sadqah 10 --------------
-- Replace whatever was seeded before with the agreed three-way split.
delete from public.profit_distribution;
insert into public.profit_distribution (name, percent, sort_order) values
  ('Partners', 60, 1),
  ('Reserve',  30, 2),
  ('Sadqah',   10, 3);

-- --- Revenue defaults to "Pending" ------------------------------------------
-- New rows now start Pending; existing rows are left untouched.
alter table public.revenue alter column status set default 'Pending';

-- --- Half-day cutoff setting -------------------------------------------------
-- A check-in at/after this Karachi wall-clock time counts as a half day
-- instead of "late" (night shift starts 18:00; anything from 21:00 is a half day).
insert into public.settings (key, value) values
  ('halfDayStartTime', '21:00')
on conflict (key) do nothing;

-- --- Recurring expenses ------------------------------------------------------
-- A template the API expands into one real expense per month, on demand.
create table if not exists public.recurring_expenses (
  recurring_id uuid primary key default gen_random_uuid(),
  amount       numeric(14,2) not null default 0,
  category     text not null,
  description  text,
  day_of_month integer not null default 1 check (day_of_month between 1 and 28),
  start_month  text not null,          -- first month to post, 'YYYY-MM'
  active       boolean not null default true,
  created_by   text,
  created_at   timestamptz not null default now()
);

-- Link generated expenses back to their template + period so re-generation is
-- idempotent. recurring_id stays NULL for manually-added expenses; NULLs never
-- collide in a unique index, so this does not constrain manual entries.
alter table public.expenses add column if not exists recurring_id uuid
  references public.recurring_expenses(recurring_id) on delete set null;
alter table public.expenses add column if not exists source_period text;  -- 'YYYY-MM'

create unique index if not exists expenses_recurring_period_uq
  on public.expenses (recurring_id, source_period);

-- --- Starter holidays for 2026 ----------------------------------------------
-- Fixed-date national holidays plus best-estimate Eid dates (moon-dependent —
-- adjust the Eid rows once the dates are confirmed).
insert into public.holidays (title, holiday_date, holiday_type) values
  ('Kashmir Solidarity Day', '2026-02-05', 'Public'),
  ('Pakistan Day',           '2026-03-23', 'Public'),
  ('Eid ul-Fitr (Day 1)',    '2026-03-20', 'Religious'),
  ('Eid ul-Fitr (Day 2)',    '2026-03-21', 'Religious'),
  ('Eid ul-Fitr (Day 3)',    '2026-03-22', 'Religious'),
  ('Labour Day',             '2026-05-01', 'Public'),
  ('Eid ul-Adha (Day 1)',    '2026-05-27', 'Religious'),
  ('Eid ul-Adha (Day 2)',    '2026-05-28', 'Religious'),
  ('Eid ul-Adha (Day 3)',    '2026-05-29', 'Religious'),
  ('Ashura (10th Muharram)', '2026-06-26', 'Religious'),
  ('Independence Day',       '2026-08-14', 'Public'),
  ('Eid Milad-un-Nabi',      '2026-08-26', 'Religious'),
  ('Iqbal Day',              '2026-11-09', 'Public'),
  ('Quaid-e-Azam Day / Christmas', '2026-12-25', 'Public')
on conflict do nothing;
