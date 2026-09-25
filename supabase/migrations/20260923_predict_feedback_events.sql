create table if not exists public.predict_feedback_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  surface text not null default 'chat',
  kind text not null check (kind in ('positive','negative','error','suggestion')),
  message_fingerprint text,
  message_excerpt text check (message_excerpt is null or char_length(message_excerpt) <= 600),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.predict_feedback_events enable row level security;
create index if not exists predict_feedback_workspace_created_idx on public.predict_feedback_events (workspace_id, created_at desc);
create index if not exists predict_feedback_kind_created_idx on public.predict_feedback_events (kind, created_at desc);
