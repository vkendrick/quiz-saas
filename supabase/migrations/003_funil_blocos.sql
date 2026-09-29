-- quiz-saas/supabase/migrations/003_funil_blocos.sql
-- Reconstrói metricas_funil_blocos: views por bloco derivadas da
-- profundidade de cada sessão (eventos não têm bloco_id).
-- Regra: respondeu a pergunta do bloco N => viu blocos 1..N.
-- conclusao/cta_clique => chegou ao fim. view/inicio => viu o 1.
-- Mesma assinatura/retorno da função antiga (só corrige os números).
create or replace function metricas_funil_blocos(p_quiz_id uuid)
returns table (
  bloco_ordem int,
  bloco_tipo text,
  bloco_titulo text,
  visualizacoes bigint,
  taxa_visualizacao numeric,
  drop_off bigint
)
language sql security definer as $$
with blocos_ord as (
  select b.id, b.ordem, b.tipo, b.config,
    coalesce(b.config->>'titulo', b.config->>'texto', '') as titulo
  from blocos b where b.quiz_id = p_quiz_id
),
numerados as (
  select id, ordem, tipo, titulo, config,
    row_number() over (order by ordem, id) as idx,
    count(*) over () as total
  from blocos_ord
),
prof as (
  select e.sessao_id,
    max(coalesce(
      (select nb.idx from numerados nb
        where nb.config->>'pergunta_id' = nullif(e.pergunta_id::text, '')),
      case when e.tipo in ('conclusao', 'cta_clique')
        then (select max(idx) from numerados)
        else 1 end
    )) as depth
  from eventos e
  where e.quiz_id = p_quiz_id and e.sessao_id is not null
  group by e.sessao_id
)
select
  n.ordem as bloco_ordem,
  n.tipo as bloco_tipo,
  n.titulo as bloco_titulo,
  count(s.sessao_id) filter (where s.depth >= n.idx) as visualizacoes,
  case when (select count(*) from prof) > 0
    then round(100.0 * count(s.sessao_id) filter (where s.depth >= n.idx)
      / (select count(*) from prof), 2)
    else 0 end as taxa_visualizacao,
  count(s.sessao_id) filter (where s.depth >= n.idx)
    - count(s.sessao_id) filter (where s.depth >= n.idx + 1) as drop_off
from numerados n
left join prof s on true
group by n.ordem, n.tipo, n.titulo, n.idx
order by n.ordem;
$$;
