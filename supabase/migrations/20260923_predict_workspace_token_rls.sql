alter table public.predict_media_generations add column if not exists workspace_secret_hash text;
alter table public.predict_feedback_events add column if not exists workspace_secret_hash text;

update public.predict_media_generations set workspace_secret_hash = encode(gen_random_bytes(32), 'hex') where workspace_secret_hash is null;
update public.predict_feedback_events set workspace_secret_hash = encode(gen_random_bytes(32), 'hex') where workspace_secret_hash is null;

alter table public.predict_media_generations alter column workspace_secret_hash set not null;
alter table public.predict_feedback_events alter column workspace_secret_hash set not null;

drop policy if exists predict_media_select_workspace on public.predict_media_generations;
drop policy if exists predict_media_insert_workspace on public.predict_media_generations;
drop policy if exists predict_media_delete_workspace on public.predict_media_generations;
drop policy if exists predict_feedback_insert_workspace on public.predict_feedback_events;

create policy predict_media_select_workspace on public.predict_media_generations for select to anon using (
  workspace_secret_hash = coalesce((current_setting('request.headers', true)::jsonb ->> 'x-predict-workspace'), '')
);
create policy predict_media_insert_workspace on public.predict_media_generations for insert to anon with check (
  workspace_secret_hash = coalesce((current_setting('request.headers', true)::jsonb ->> 'x-predict-workspace'), '')
);
create policy predict_media_delete_workspace on public.predict_media_generations for delete to anon using (
  workspace_secret_hash = coalesce((current_setting('request.headers', true)::jsonb ->> 'x-predict-workspace'), '')
);
create policy predict_feedback_insert_workspace on public.predict_feedback_events for insert to anon with check (
  workspace_secret_hash = coalesce((current_setting('request.headers', true)::jsonb ->> 'x-predict-workspace'), '')
);

grant select, insert, delete on table public.predict_media_generations to anon;
grant insert on table public.predict_feedback_events to anon;
