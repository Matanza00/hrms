-- ============================================================================
-- Feedback reports + storage buckets (replaces Google Drive screenshots)
-- ============================================================================

create table public.feedback (
  feedback_id    uuid primary key default gen_random_uuid(),
  type           text,
  reason         text,
  page_path      text,
  page_url       text,
  role           text,
  reporter_name  text,
  reporter_email text,
  reporter_code  text,
  user_agent     text,
  viewport       text,
  screenshot_url text,
  status         text not null default 'New' check (status in ('New','In Progress','Resolved','Dismissed')),
  created_at     timestamptz not null default now()
);
create index feedback_status_idx  on public.feedback (status);
create index feedback_created_idx on public.feedback (created_at desc);

-- Storage buckets. Feedback screenshots are public-read (shareable link like the
-- old Drive behaviour); employee documents are private (served via signed URLs).
insert into storage.buckets (id, name, public)
values
  ('feedback-screenshots', 'feedback-screenshots', true),
  ('employee-documents',   'employee-documents',   false)
on conflict (id) do nothing;
