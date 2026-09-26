create table if not exists public.predict_auto_lessons (
  id text primary key,
  category text not null,
  surface text not null,
  instruction text not null,
  tags text[] not null default '{}',
  evidence_count integer not null default 0 check (evidence_count >= 0),
  negative_count integer not null default 0 check (negative_count >= 0),
  error_count integer not null default 0 check (error_count >= 0),
  confidence numeric(5,4) not null default 0,
  promoted boolean not null default false,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.predict_auto_lessons enable row level security;

grant select on public.predict_auto_lessons to anon, authenticated;
revoke insert, update, delete on public.predict_auto_lessons from anon, authenticated;

drop policy if exists "predict_auto_lessons_read_promoted" on public.predict_auto_lessons;
create policy "predict_auto_lessons_read_promoted"
on public.predict_auto_lessons
for select
to anon, authenticated
using (promoted = true);

create schema if not exists private;

create or replace function private.predict_feedback_autolearn()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  lesson_id text;
  lesson_category text;
  lesson_instruction text;
  lesson_tags text[];
begin
  if new.kind not in ('negative','error') then
    return new;
  end if;

  if new.surface = 'media' then
    lesson_id := 'media-reliability';
    lesson_category := 'media-reliability';
    lesson_instruction := 'Quando geração de mídia falhar ou for rejeitada, preserve o pedido original, não substitua por conteúdo desconexo e só apresente resultado quando houver artefato real validado.';
    lesson_tags := array['imagem','video','media','imagine','geracao','personagem','artefato','provider'];
  elsif new.surface = 'chat' and new.kind = 'error' then
    lesson_id := 'chat-failure-recovery';
    lesson_category := 'chat-failure-recovery';
    lesson_instruction := 'Quando uma rota de chat falhar, preserve a intenção exata do usuário, tente outra rota compatível e rejeite qualquer fallback que mude de assunto ou despeje contexto interno.';
    lesson_tags := array['chat','erro','falha','provider','fallback','relevancia','roteamento'];
  elsif new.surface = 'chat' and new.kind = 'negative' then
    lesson_id := 'chat-negative-relevance';
    lesson_category := 'chat-negative-relevance';
    lesson_instruction := 'Feedback negativo em chat exige mais aderência ao pedido: prefira resposta direta, valide sobreposição temática e suprima README, blocos Relacionado, corpus ou conhecimento recuperado que não responda à pergunta.';
    lesson_tags := array['chat','relevancia','rag','github','readme','relacionado','resposta','direta'];
  else
    lesson_id := 'generic-runtime-failure';
    lesson_category := 'generic-runtime-failure';
    lesson_instruction := 'Em falhas repetidas, preserve o pedido original, não invente sucesso e não substitua a tarefa por conteúdo não relacionado.';
    lesson_tags := array['erro','falha','relevancia','fallback'];
  end if;

  insert into public.predict_auto_lessons(
    id, category, surface, instruction, tags,
    evidence_count, negative_count, error_count,
    confidence, promoted, first_seen, last_seen, updated_at
  )
  values(
    lesson_id, lesson_category, new.surface, lesson_instruction, lesson_tags,
    1,
    case when new.kind = 'negative' then 1 else 0 end,
    case when new.kind = 'error' then 1 else 0 end,
    0.60,
    false,
    new.created_at, new.created_at, now()
  )
  on conflict (id) do update
  set
    evidence_count = public.predict_auto_lessons.evidence_count + 1,
    negative_count = public.predict_auto_lessons.negative_count + case when new.kind = 'negative' then 1 else 0 end,
    error_count = public.predict_auto_lessons.error_count + case when new.kind = 'error' then 1 else 0 end,
    last_seen = greatest(public.predict_auto_lessons.last_seen, new.created_at),
    updated_at = now(),
    confidence = least(0.99, 0.55 + ln(1 + public.predict_auto_lessons.evidence_count + 1) * 0.12),
    promoted = (public.predict_auto_lessons.evidence_count + 1) >= 3;

  return new;
end;
$$;

revoke all on function private.predict_feedback_autolearn() from public, anon, authenticated;

drop trigger if exists predict_feedback_autolearn_trg on public.predict_feedback_events;
create trigger predict_feedback_autolearn_trg
after insert on public.predict_feedback_events
for each row
execute function private.predict_feedback_autolearn();

insert into public.predict_auto_lessons(
  id, category, surface, instruction, tags,
  evidence_count, negative_count, error_count,
  confidence, promoted, first_seen, last_seen, updated_at
)
select
  'media-reliability','media-reliability','media',
  'Quando geração de mídia falhar ou for rejeitada, preserve o pedido original, não substitua por conteúdo desconexo e só apresente resultado quando houver artefato real validado.',
  array['imagem','video','media','imagine','geracao','personagem','artefato','provider'],
  count(*)::int,0,count(*)::int,
  least(0.99,0.55+ln(1+count(*))*0.12),
  count(*) >= 3,
  min(created_at),max(created_at),now()
from public.predict_feedback_events
where surface='media' and kind='error'
having count(*) > 0
on conflict (id) do update set
  evidence_count=excluded.evidence_count,
  negative_count=excluded.negative_count,
  error_count=excluded.error_count,
  confidence=excluded.confidence,
  promoted=excluded.promoted,
  first_seen=excluded.first_seen,
  last_seen=excluded.last_seen,
  updated_at=now();

insert into public.predict_auto_lessons(
  id, category, surface, instruction, tags,
  evidence_count, negative_count, error_count,
  confidence, promoted, first_seen, last_seen, updated_at
)
select
  'chat-failure-recovery','chat-failure-recovery','chat',
  'Quando uma rota de chat falhar, preserve a intenção exata do usuário, tente outra rota compatível e rejeite qualquer fallback que mude de assunto ou despeje contexto interno.',
  array['chat','erro','falha','provider','fallback','relevancia','roteamento'],
  count(*)::int,0,count(*)::int,
  least(0.99,0.55+ln(1+count(*))*0.12),
  count(*) >= 3,
  min(created_at),max(created_at),now()
from public.predict_feedback_events
where surface='chat' and kind='error'
having count(*) > 0
on conflict (id) do update set
  evidence_count=excluded.evidence_count,
  negative_count=excluded.negative_count,
  error_count=excluded.error_count,
  confidence=excluded.confidence,
  promoted=excluded.promoted,
  first_seen=excluded.first_seen,
  last_seen=excluded.last_seen,
  updated_at=now();

insert into public.predict_auto_lessons(
  id, category, surface, instruction, tags,
  evidence_count, negative_count, error_count,
  confidence, promoted, first_seen, last_seen, updated_at
)
select
  'chat-negative-relevance','chat-negative-relevance','chat',
  'Feedback negativo em chat exige mais aderência ao pedido: prefira resposta direta, valide sobreposição temática e suprima README, blocos Relacionado, corpus ou conhecimento recuperado que não responda à pergunta.',
  array['chat','relevancia','rag','github','readme','relacionado','resposta','direta'],
  count(*)::int,count(*)::int,0,
  least(0.99,0.55+ln(1+count(*))*0.12),
  count(*) >= 3,
  min(created_at),max(created_at),now()
from public.predict_feedback_events
where surface='chat' and kind='negative'
having count(*) > 0
on conflict (id) do update set
  evidence_count=excluded.evidence_count,
  negative_count=excluded.negative_count,
  error_count=excluded.error_count,
  confidence=excluded.confidence,
  promoted=excluded.promoted,
  first_seen=excluded.first_seen,
  last_seen=excluded.last_seen,
  updated_at=now();

