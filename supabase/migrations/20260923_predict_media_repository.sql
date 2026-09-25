create table if not exists public.predict_media_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  kind text not null default 'image' check (kind in ('image','video','storyboard')),
  status text not null default 'ready' check (status in ('queued','generating','ready','error')),
  provider text not null default 'pollinations',
  model text,
  prompt text not null check (char_length(prompt) <= 12000),
  enhanced_prompt text check (enhanced_prompt is null or char_length(enhanced_prompt) <= 16000),
  style text,
  aspect_ratio text,
  width integer check (width is null or (width between 128 and 4096)),
  height integer check (height is null or (height between 128 and 4096)),
  seed bigint,
  remote_url text,
  thumbnail_url text,
  storage_path text,
  pinned boolean not null default false,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.predict_media_generations enable row level security;

create index if not exists predict_media_workspace_created_idx
  on public.predict_media_generations (workspace_id, created_at desc);

create index if not exists predict_media_prune_idx
  on public.predict_media_generations (created_at)
  where pinned = false;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'predict-media',
  'predict-media',
  false,
  3145728,
  array['image/webp','image/jpeg','image/png']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.predict_media_generations is
  'PredictLM media metadata. Default generations store URLs/prompts only; binary storage is reserved for explicitly pinned small images to minimize Postgres and Storage usage.';
