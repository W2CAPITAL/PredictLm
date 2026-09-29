create extension if not exists pgcrypto;

drop policy if exists predict_media_select_workspace on public.predict_media_generations;
drop policy if exists predict_media_insert_workspace on public.predict_media_generations;
drop policy if exists predict_media_delete_workspace on public.predict_media_generations;
drop policy if exists predict_feedback_insert_workspace on public.predict_feedback_events;

create policy predict_media_select_workspace on public.predict_media_generations for select to anon using (
  workspace_secret_hash = encode(
    digest(coalesce((current_setting('request.headers', true)::jsonb ->> 'x-predict-workspace'), ''), 'sha256'),
    'hex'
  )
);
create policy predict_media_insert_workspace on public.predict_media_generations for insert to anon with check (
  workspace_secret_hash = encode(
    digest(coalesce((current_setting('request.headers', true)::jsonb ->> 'x-predict-workspace'), ''), 'sha256'),
    'hex'
  )
);
create policy predict_media_delete_workspace on public.predict_media_generations for delete to anon using (
  workspace_secret_hash = encode(
    digest(coalesce((current_setting('request.headers', true)::jsonb ->> 'x-predict-workspace'), ''), 'sha256'),
    'hex'
  )
);
create policy predict_feedback_insert_workspace on public.predict_feedback_events for insert to anon with check (
  workspace_secret_hash = encode(
    digest(coalesce((current_setting('request.headers', true)::jsonb ->> 'x-predict-workspace'), ''), 'sha256'),
    'hex'
  )
);
