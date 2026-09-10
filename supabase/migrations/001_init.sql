-- =====================================================
-- 001_init.sql
-- =====================================================
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  slug text unique not null,
  titulo text not null,
  subtitulo text,
  tema jsonb default '{"primary":"#3B82F6","bg":"#ffffff","texto":"#111827"}',
  ativo boolean default true,
  criado_em timestamptz default now()
);

create table if not exists perguntas (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  ordem int not null,
  texto text not null,
  tipo text default 'unica',
  obrigatoria boolean default true
);
create index if not exists idx_perguntas_quiz on perguntas(quiz_id, ordem);

create table if not exists opcoes (
  id uuid primary key default gen_random_uuid(),
  pergunta_id uuid references perguntas(id) on delete cascade,
  texto text not null,
  valor int default 0,
  proxima_pergunta uuid references perguntas(id) on delete set null,
  metadata jsonb default '{}'
);
create index if not exists idx_opcoes_pergunta on opcoes(pergunta_id);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade,
  nome text,
  email text,
  telefone text,
  respostas jsonb,
  score int default 0,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  criado_em timestamptz default now()
);
create index if not exists idx_leads_quiz on leads(quiz_id, criado_em desc);

create table if not exists eventos (
  id bigserial primary key,
  quiz_id uuid references quizzes(id) on delete cascade,
  lead_id uuid references leads(id) on delete set null,
  sessao_id text,
  tipo text not null,
  pergunta_id uuid references perguntas(id) on delete set null,
  opcao_id uuid references opcoes(id) on delete set null,
  tempo_ms int,
  dispositivo text,
  user_agent text,
  utm_source text,
  utm_campaign text,
  criado_em timestamptz default now()
);
create index if not exists idx_eventos_quiz on eventos(quiz_id, criado_em desc);
create index if not exists idx_eventos_tipo on eventos(tipo);
create index if not exists idx_eventos_pergunta on eventos(pergunta_id);
create index if not exists idx_eventos_sessao on eventos(sessao_id);

alter table quizzes enable row level security;
alter table perguntas enable row level security;
alter table opcoes enable row level security;
alter table leads enable row level security;
alter table eventos enable row level security;

drop policy if exists "dono gerencia quizzes" on quizzes;
create policy "dono gerencia quizzes" on quizzes for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "publico le quizzes ativos" on quizzes;
create policy "publico le quizzes ativos" on quizzes for select using (ativo = true);

drop policy if exists "leitura publica perguntas" on perguntas;
create policy "leitura publica perguntas" on perguntas for select using (true);
drop policy if exists "dono gerencia perguntas" on perguntas;
create policy "dono gerencia perguntas" on perguntas for all using (exists (select 1 from quizzes q where q.id = perguntas.quiz_id and q.owner_id = auth.uid())) with check (exists (select 1 from quizzes q where q.id = perguntas.quiz_id and q.owner_id = auth.uid()));

drop policy if exists "leitura publica opcoes" on opcoes;
create policy "leitura publica opcoes" on opcoes for select using (true);
drop policy if exists "dono gerencia opcoes" on opcoes;
create policy "dono gerencia opcoes" on opcoes for all using (exists (select 1 from perguntas p join quizzes q on q.id = p.quiz_id where p.id = opcoes.pergunta_id and q.owner_id = auth.uid())) with check (exists (select 1 from perguntas p join quizzes q on q.id = p.quiz_id where p.id = opcoes.pergunta_id and q.owner_id = auth.uid()));

drop policy if exists "qualquer um insere lead" on leads;
create policy "qualquer um insere lead" on leads for insert with check (true);
drop policy if exists "dono le leads" on leads;
create policy "dono le leads" on leads for select using (exists (select 1 from quizzes q where q.id = leads.quiz_id and q.owner_id = auth.uid()));

drop policy if exists "qualquer um insere evento" on eventos;
create policy "qualquer um insere evento" on eventos for insert with check (true);
drop policy if exists "dono le eventos" on eventos;
create policy "dono le eventos" on eventos for select using (exists (select 1 from quizzes q where q.id = eventos.quiz_id and q.owner_id = auth.uid()));

create or replace function metricas_resumo(p_quiz_id uuid, p_intervalo interval default '7 days')
returns table (visualizacoes bigint, inicios bigint, conclusoes bigint, tempo_medio numeric, taxa_conclusao numeric)
language sql security definer as $$
  select
    count(*) filter (where tipo='view'),
    count(*) filter (where tipo='inicio'),
    count(*) filter (where tipo='conclusao'),
    coalesce(round(avg(tempo_ms) filter (where tipo='resposta')), 0),
    case when count(*) filter (where tipo='inicio') > 0
      then round(100.0 * count(*) filter (where tipo='conclusao') / count(*) filter (where tipo='inicio'), 2)
      else 0 end
  from eventos where quiz_id = p_quiz_id and criado_em > now() - p_intervalo;
$$;

create or replace function metricas_funil(p_quiz_id uuid, p_intervalo interval default '7 days')
returns table (pergunta_id uuid, texto text, ordem int, responderam bigint)
language sql security definer as $$
  select p.id, p.texto, p.ordem, count(distinct e.sessao_id) as responderam
  from perguntas p
  left join eventos e on e.pergunta_id = p.id and e.tipo='resposta' and e.criado_em > now() - p_intervalo
  where p.quiz_id = p_quiz_id
  group by p.id, p.texto, p.ordem order by p.ordem;
$$;

create or replace function metricas_dispositivos(p_quiz_id uuid, p_intervalo interval default '7 days')
returns table (dispositivo text, total bigint)
language sql security definer as $$
  select coalesce(dispositivo,'desconhecido'), count(distinct sessao_id)
  from eventos where quiz_id = p_quiz_id and criado_em > now() - p_intervalo
  group by dispositivo;
$$;

create or replace function metricas_campanhas(p_quiz_id uuid, p_intervalo interval default '7 days')
returns table (utm_campaign text, leads bigint)
language sql security definer as $$
  select coalesce(utm_campaign,'(direto)'), count(*)
  from leads where quiz_id = p_quiz_id and criado_em > now() - p_intervalo
  group by utm_campaign order by 2 desc limit 10;
$$;

create or replace function metricas_respostas_opcoes(p_quiz_id uuid, p_intervalo interval default '7 days')
returns table (pergunta_id uuid, pergunta_texto text, opcao_id uuid, opcao_texto text, total bigint)
language sql security definer as $$
  select p.id, p.texto, o.id, o.texto, count(e.id)
  from perguntas p join opcoes o on o.pergunta_id = p.id
  left join eventos e on e.opcao_id = o.id and e.tipo='resposta' and e.criado_em > now() - p_intervalo
  where p.quiz_id = p_quiz_id
  group by p.id, p.texto, p.ordem, o.id, o.texto order by p.ordem, o.texto;
$$;
