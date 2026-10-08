-- ============================================================================
-- Employee documents (Supabase Storage) + "Notice Period" employment status.
--
--   * documents: metadata rows; the files live in a private Storage bucket and
--     are uploaded/served through the Edge Function (service role), so no
--     per-user Storage RLS is required.
--   * Employment status gains 'Notice Period' and 'Resigned' so an admin can
--     move someone from Permanent -> Notice Period when they resign.
-- Safe to re-run.
-- ============================================================================

-- --- Documents table --------------------------------------------------------
create table if not exists public.documents (
  document_id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(employee_id) on delete cascade,
  title       text not null,
  category    text not null default 'Other',
  file_path   text not null,          -- object path inside the bucket
  file_name   text not null,
  mime_type   text,
  size_bytes  bigint,
  uploaded_by text,
  created_at  timestamptz not null default now()
);
create index if not exists documents_employee_idx on public.documents (employee_id);

-- --- Private Storage bucket for those files ----------------------------------
insert into storage.buckets (id, name, public)
values ('employee-docs', 'employee-docs', false)
on conflict (id) do nothing;

-- --- Employment status: add Notice Period / Resigned ------------------------
alter table public.employees drop constraint if exists employees_status_check;
alter table public.employees add constraint employees_status_check
  check (status in ('Permanent','Contract','Intern','Probation','Notice Period','Resigned'));
