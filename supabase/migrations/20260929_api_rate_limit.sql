create table if not exists public.predict_api_rate_limits (
  key_hash text not null,
  bucket text not null,
  window_start timestamptz not null default clock_timestamp(),
  count integer not null default 0,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (key_hash,bucket)
);

alter table public.predict_api_rate_limits enable row level security;
revoke all on table public.predict_api_rate_limits from anon, authenticated;

create or replace function public.predict_take_rate_limit(
  p_key_hash text,
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, remaining integer, retry_after_seconds integer)
language plpgsql
security definer
set search_path=public
as $$
declare
  now_ts timestamptz := clock_timestamp();
  row_count integer;
  row_window timestamptz;
begin
  if coalesce(length(p_key_hash),0)<16 or coalesce(length(p_bucket),0)<1 then
    raise exception 'invalid rate limit key';
  end if;
  p_limit := greatest(1,least(coalesce(p_limit,60),10000));
  p_window_seconds := greatest(1,least(coalesce(p_window_seconds,60),86400));

  insert into public.predict_api_rate_limits(key_hash,bucket,window_start,count,updated_at)
  values(p_key_hash,p_bucket,now_ts,1,now_ts)
  on conflict(key_hash,bucket) do update
    set count=case
      when extract(epoch from (now_ts-predict_api_rate_limits.window_start))>=p_window_seconds then 1
      else predict_api_rate_limits.count+1
    end,
    window_start=case
      when extract(epoch from (now_ts-predict_api_rate_limits.window_start))>=p_window_seconds then now_ts
      else predict_api_rate_limits.window_start
    end,
    updated_at=now_ts
  returning count,window_start into row_count,row_window;

  allowed := row_count<=p_limit;
  remaining := greatest(0,p_limit-row_count);
  retry_after_seconds := greatest(1,ceil(p_window_seconds-extract(epoch from (now_ts-row_window)))::integer);
  return next;
end;
$$;

revoke all on function public.predict_take_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.predict_take_rate_limit(text,text,integer,integer) to service_role;

create index if not exists predict_api_rate_limits_updated_at_idx on public.predict_api_rate_limits(updated_at);
