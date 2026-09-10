-- =====================================================
-- 002_features.sql — A/B, CRM, pixels, resultado, storage
-- =====================================================

alter table quizzes
  add column if not exists integracoes jsonb default '{}',
  add column if not exists pagina_resultado jsonb default '{}';

alter table perguntas
  add column if not exists variantes jsonb default '[]',
  add column if not exists imagem_url text;

create table if not exists ab_atribuicao (
  id bigserial primary key,
  quiz_id uuid references quizzes(id) on delete cascade,
  sessao_id text not null,
  pergunta_id uuid references perguntas(id) on delete cascade,
  variante text not null,
  criado_em timestamptz default now(),
  unique(sessao_id, pergunta_id)
);
create index if not exists idx_ab_quiz on ab_atribuicao(quiz_id);

alter table ab_atribuicao enable row level security;
drop policy if exists "ab insert publico" on ab_atribuicao;
create policy "ab insert publico" on ab_atribuicao for insert with check (true);
drop policy if exists "ab dono le" on ab_atribuicao;
create policy "ab dono le" on ab_atribuicao for select using (exists (select 1 from quizzes q where q.id = ab_atribuicao.quiz_id and q.owner_id = auth.uid()));

alter table eventos add column if not exists variante text;

alter table leads
  add column if not exists status text default 'novo',
  add column if not exists tags text[] default '{}',
  add column if not exists valor_negocio numeric default 0,
  add column if not exists atualizado_em timestamptz default now();

create table if not exists notas_lead (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  autor_id uuid references auth.users(id),
  texto text not null,
  criado_em timestamptz default now()
);
create index if not exists idx_notas_lead on notas_lead(lead_id, criado_em desc);

create table if not exists historico_lead (
  id bigserial primary key,
  lead_id uuid references leads(id) on delete cascade,
  mudanca text not null,
  detalhes jsonb,
  autor_id uuid references auth.users(id),
  criado_em timestamptz default now()
);
create index if not exists idx_hist_lead on historico_lead(lead_id, criado_em desc);

alter table notas_lead enable row level security;
alter table historico_lead enable row level security;

drop policy if exists "dono notas" on notas_lead;
create policy "dono notas" on notas_lead for all
  using (exists (select 1 from leads l join quizzes q on q.id = l.quiz_id where l.id = notas_lead.lead_id and q.owner_id = auth.uid()))
  with check (exists (select 1 from leads l join quizzes q on q.id = l.quiz_id where l.id = notas_lead.lead_id and q.owner_id = auth.uid()));

drop policy if exists "dono historico" on historico_lead;
create policy "dono historico" on historico_lead for all
  using (exists (select 1 from leads l join quizzes q on q.id = l.quiz_id where l.id = historico_lead.lead_id and q.owner_id = auth.uid()))
  with check (exists (select 1 from leads l join quizzes q on q.id = l.quiz_id where l.id = historico_lead.lead_id and q.owner_id = auth.uid()));

drop policy if exists "dono atualiza lead" on leads;
create policy "dono atualiza lead" on leads for update
  using (exists (select 1 from quizzes q where q.id = leads.quiz_id and q.owner_id = auth.uid()))
  with check (exists (select 1 from quizzes q where q.id = leads.quiz_id and q.owner_id = auth.uid()));

create or replace function metricas_ab(p_quiz_id uuid, p_intervalo interval default '30 days')
returns table (pergunta_id uuid, pergunta_texto text, variante text, respostas bigint, conclusoes bigint, taxa_conclusao numeric)
language sql security definer as $$
  with base as (
    select a.pergunta_id, p.texto as pergunta_texto, a.variante, a.sessao_id
    from ab_atribuicao a join perguntas p on p.id = a.pergunta_id
    where a.quiz_id = p_quiz_id and a.criado_em > now() - p_intervalo
  ),
  resp as (
    select b.pergunta_id, b.variante, count(distinct e.sessao_id) as respostas
    from base b
    left join eventos e on e.sessao_id = b.sessao_id and e.pergunta_id = b.pergunta_id and e.tipo = 'resposta'
    group by 1, 2
  ),
  conv as (
    select b.pergunta_id, b.variante, count(distinct e.sessao_id) as conclusoes
    from base b
    left join eventos e on e.sessao_id = b.sessao_id and e.tipo = 'conclusao'
    group by 1, 2
  )
  select base.pergunta_id, max(base.pergunta_texto), base.variante,
    coalesce(max(resp.respostas), 0), coalesce(max(conv.conclusoes), 0),
    case when coalesce(max(resp.respostas), 0) > 0
      then round(100.0 * coalesce(max(conv.conclusoes), 0) / max(resp.respostas), 2)
      else 0 end
  from base
  left join resp on resp.pergunta_id = base.pergunta_id and resp.variante = base.variante
  left join conv on conv.pergunta_id = base.pergunta_id and conv.variante = base.variante
  group by base.pergunta_id, base.variante order by base.pergunta_id, base.variante;
$$;

create or replace function crm_resumo(p_quiz_id uuid)
returns table (status text, total bigint, valor numeric)
language sql security definer as $$
  select coalesce(status, 'novo'), count(*), coalesce(sum(valor_negocio), 0)
  from leads
  where quiz_id = p_quiz_id
    and exists (select 1 from quizzes q where q.id = leads.quiz_id and q.owner_id = auth.uid())
  group by status;
$$;

insert into storage.buckets (id, name, public)
values ('quiz-media', 'quiz-media', true)
on conflict (id) do nothing;

drop policy if exists "media leitura publica" on storage.objects;
create policy "media leitura publica" on storage.objects for select using (bucket_id = 'quiz-media');

drop policy if exists "media upload autenticado" on storage.objects;
create policy "media upload autenticado" on storage.objects for insert to authenticated with check (bucket_id = 'quiz-media');

drop policy if exists "media update autenticado" on storage.objects;
create policy "media update autenticado" on storage.objects for update to authenticated using (bucket_id = 'quiz-media');

drop policy if exists "media delete autenticado" on storage.objects;
create policy "media delete autenticado" on storage.objects for delete to authenticated using (bucket_id = 'quiz-media');

create or replace function tg_lead_touch() returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end $$;

drop trigger if exists trg_lead_touch on leads;
create trigger trg_lead_touch before update on leads for each row execute function tg_lead_touch();
