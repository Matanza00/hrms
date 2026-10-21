-- ============================================================================
-- Paid payroll is posted to expenses.
--
-- Every payroll row whose status is 'Paid' owns exactly one 'Salary' expense
-- (amount = net salary, dated the last day of the payroll month). The trigger
-- keeps it in step: marking a payroll Paid posts/updates it, and moving the
-- payroll back to Generated (recalculate) or Cancelled removes it. Doing this in
-- the database means no API path can forget to sync it.
-- Idempotent, so re-running `supabase db push` is safe.
-- ============================================================================

-- Link back to the payroll row. ON DELETE SET NULL: if a payroll row is ever
-- removed (employee deleted), the salary that was actually paid stays on the books.
alter table public.expenses add column if not exists payroll_id uuid
  references public.payroll(payroll_id) on delete set null;

-- One expense per payroll row. NULLs never collide, so manual and recurring
-- expenses (payroll_id NULL) are unaffected.
create unique index if not exists expenses_payroll_uq on public.expenses (payroll_id);

-- Post (or refresh) the salary expense for one Paid payroll row.
create or replace function public.post_payroll_expense(p public.payroll)
returns void
language plpgsql
set search_path = public
as $$
declare
  month_start date := to_date(p.month || '-01', 'YYYY-MM-DD');
  emp_name    text;
begin
  select name into emp_name from public.employees where employee_id = p.employee_id;

  insert into public.expenses
    (expense_date, amount, category, description, created_by, payroll_id, source_period)
  values (
    (month_start + interval '1 month' - interval '1 day')::date,
    p.net_salary,
    'Salary',
    'Salary — ' || coalesce(emp_name, 'Employee') || ' (' || to_char(month_start, 'Mon YYYY') || ')',
    'payroll',
    p.payroll_id,
    p.month
  )
  on conflict (payroll_id) do update set
    expense_date  = excluded.expense_date,
    amount        = excluded.amount,
    category      = excluded.category,
    description   = excluded.description,
    source_period = excluded.source_period;
end;
$$;

-- Internal helper only: keep it off the PostgREST /rpc surface.
revoke execute on function public.post_payroll_expense(public.payroll) from public, anon, authenticated;

create or replace function public.sync_payroll_expense()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'Paid' then
    perform public.post_payroll_expense(new);
  else
    delete from public.expenses where payroll_id = new.payroll_id;
  end if;
  return new;
end;
$$;

drop trigger if exists payroll_expense_sync on public.payroll;
create trigger payroll_expense_sync
  after insert or update of status, net_salary, month, employee_id on public.payroll
  for each row execute function public.sync_payroll_expense();

-- Backfill: payroll already marked Paid before this migration.
select public.post_payroll_expense(p) from public.payroll p where p.status = 'Paid';
