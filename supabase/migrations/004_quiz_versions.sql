-- quiz-saas/supabase/migrations/004_quiz_versions.sql
-- Versionamento de quizzes: snapshots + carimbo de versão nos eventos.
-- RODAR 1x no painel Supabase → SQL Editor (não há DDL via API).
create table if not exists quiz_versions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  numero int not null,
  nome text,
  snapshot jsonb not null,
  criado_em timestamptz default now(),
  unique(quiz_id, numero)
);
alter table quizzes add column if not exists versao_atual int default 1;
alter table eventos add column if not exists quiz_version int;

-- Versão atual p/ o quiz público (security definer: fura RLS, só leitura).
create or replace function quiz_versao_atual(p_slug text)
returns int language sql security definer as $$
  select coalesce(max(versao_atual), 1) from quizzes where slug = p_slug;
$$;

-- Leitura/escrita pelo dono do quiz (espelha RLS de quizzes/blocos).
alter table quiz_versions enable row level security;
drop policy if exists "dono le versoes" on quiz_versions;
create policy "dono le versoes" on quiz_versions for select using (
  exists (select 1 from quizzes q where q.id = quiz_versions.quiz_id and q.owner_id = auth.uid())
);
drop policy if exists "dono escreve versoes" on quiz_versions;
create policy "dono escreve versoes" on quiz_versions for all using (
  exists (select 1 from quizzes q where q.id = quiz_versions.quiz_id and q.owner_id = auth.uid())
);
