-- ============================================================
-- CÓDIGO DA UNHA — V2 (Resultado por Categoria)
-- Roda no Supabase → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. Adicionar "categoria" em cada opção
-- ------------------------------------------------------------
DO $$
DECLARE
  v_quiz uuid;
BEGIN
  SELECT id INTO v_quiz FROM quizzes WHERE slug = 'codigo-da-unha';

  IF v_quiz IS NULL THEN
    RAISE NOTICE 'Quiz codigo-da-unha não encontrado.';
    RETURN;
  END IF;

  -- P1 — Cor da unha
  UPDATE opcoes SET metadata = metadata || '{"categoria":"fungo"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 1)
    AND texto IN ('Amarela ou marrom', 'Branca com manchas opacas');

  UPDATE opcoes SET metadata = metadata || '{"categoria":"trauma"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 1)
    AND texto = 'Escura / preta / azulada';

  UPDATE opcoes SET metadata = metadata || '{"categoria":"fragilidade"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 1)
    AND texto LIKE 'Cor normal%';

  -- P2 — Textura
  UPDATE opcoes SET metadata = metadata || '{"categoria":"fungo"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 2)
    AND texto LIKE 'Ficou grossa%';

  UPDATE opcoes SET metadata = metadata || '{"categoria":"fragilidade"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 2)
    AND texto IN ('Está quebradiça ou descascando', 'Não mudou muito');

  UPDATE opcoes SET metadata = metadata || '{"categoria":"encravada"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 2)
    AND texto LIKE 'Parece normal%';

  -- P3 — Dor
  UPDATE opcoes SET metadata = metadata || '{"categoria":"encravada"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 3)
    AND texto LIKE 'Dor lateral%';

  UPDATE opcoes SET metadata = metadata || '{"categoria":"fungo"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 3)
    AND texto LIKE 'Sensação de pressão%';

  UPDATE opcoes SET metadata = metadata || '{"categoria":"trauma"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 3)
    AND texto LIKE 'Dor após pancada%';

  UPDATE opcoes SET metadata = metadata || '{"categoria":"fragilidade"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 3)
    AND texto = 'Nenhuma dor';

  -- P4 — Tempo
  UPDATE opcoes SET metadata = metadata || '{"categoria":"trauma"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 4)
    AND texto = 'Menos de 2 semanas';

  UPDATE opcoes SET metadata = metadata || '{"categoria":"fungo"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 4)
    AND texto IN ('Entre 1 e 3 meses', 'Mais de 3 meses');

  UPDATE opcoes SET metadata = metadata || '{"categoria":"fragilidade"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 4)
    AND texto LIKE 'Não sei%';

  -- P5 — Ambiente
  UPDATE opcoes SET metadata = metadata || '{"categoria":"fungo"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 5)
    AND texto LIKE 'Academia, piscina%';

  UPDATE opcoes SET metadata = metadata || '{"categoria":"encravada"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 5)
    AND texto LIKE 'Calçados apertados%';

  UPDATE opcoes SET metadata = metadata || '{"categoria":"fragilidade"}'::jsonb
  WHERE pergunta_id = (SELECT id FROM perguntas WHERE quiz_id = v_quiz AND ordem = 5)
    AND texto IN ('Pouco movimento, fico muito em casa', 'Nenhum desses');

  RAISE NOTICE 'Categorias aplicadas com sucesso!';
END $$;

-- ------------------------------------------------------------
-- 2. Trocar o bloco "resultado" para modo "por_categoria"
-- ------------------------------------------------------------
UPDATE blocos
SET config = jsonb_build_object(
  'tipo', 'por_categoria',
  'titulo', 'Diagnóstico completo do seu caso',
  'grafico_final', true,
  'cta', 'Ver meu protocolo →',
  'categorias', jsonb_build_object(
    'fungo', jsonb_build_object(
      'badge', 'Diagnóstico: Fungo',
      'titulo', 'Sua unha tem ==sinais claros de fungo== (onicomicose).',
      'texto', 'Suas respostas apontam pra um quadro **fúngico** — provavelmente causado por dermatófitos que se alimentam da queratina da unha.\n\nA boa notícia? ==É o tipo de problema que responde mais rápido ao protocolo certo==. Com óleos antifúngicos específicos, você vê melhora em 2-3 semanas e recupera a unha em 6-8 semanas.\n\n**O fungo volta porque a maioria trata só o sintoma. O protocolo vai na raiz.**',
      'cta_url', 'https://seu-checkout.com/codigo-da-unha',
      'cta_texto', 'Quero o protocolo antifúngico agora →'
    ),
    'encravada', jsonb_build_object(
      'badge', 'Diagnóstico: Unha encravada',
      'titulo', 'Sua unha está ==crescendo pra dentro da pele==.',
      'texto', 'Suas respostas mostram **onicocriptose** — a lâmina crescendo lateralmente e pressionando a pele. Isso causa dor, inflamação e risco de infecção se não tratar.\n\nA boa notícia: ==existe um método específico== pra cortar, redirecionar o crescimento e aliviar a dor em poucos dias.\n\n**Sem precisar ir ao podólogo toda semana.**',
      'cta_url', 'https://seu-checkout.com/codigo-da-unha',
      'cta_texto', 'Quero o protocolo de correção →'
    ),
    'trauma', jsonb_build_object(
      'badge', 'Diagnóstico: Trauma ungueal',
      'titulo', 'Sua unha sofreu uma ==lesão ou impacto recente==.',
      'texto', 'Mancha escura ou azulada embaixo da lâmina é **hematoma subungueal** — sangue acumulado após pancada. Na maioria dos casos resolve sozinho, mas há cuidados essenciais pra evitar infecção e perda da unha.\n\n==Se a dor for intensa ou a mancha crescer rápido==, procure um médico. Pra casos leves, o protocolo em casa resolve.',
      'cta_url', 'https://seu-checkout.com/codigo-da-unha',
      'cta_texto', 'Ver cuidados de recuperação →'
    ),
    'fragilidade', jsonb_build_object(
      'badge', 'Diagnóstico: Fragilidade ungueal',
      'titulo', 'Sua unha está ==fraca e precisa de nutrição==.',
      'texto', 'Unhas quebradiças, descascando ou que não crescem indicam **deficiência de nutrientes** ou dano crônico da camada ungueal.\n\nA boa notícia: ==óleos específicos restauram a estrutura== em 4-8 semanas. E você pode começar hoje com o que tem em casa.\n\n**Nutrir a unha é prevenir problemas maiores — como fungo.**',
      'cta_url', 'https://seu-checkout.com/codigo-da-unha',
      'cta_texto', 'Quero o protocolo de nutrição →'
    )
  )
)
WHERE quiz_id = (SELECT id FROM quizzes WHERE slug = 'codigo-da-unha')
  AND tipo = 'resultado';

-- ------------------------------------------------------------
-- 3. Verificar
-- ------------------------------------------------------------
SELECT
  o.texto as opcao,
  o.metadata->>'categoria' as categoria,
  p.ordem as pergunta_ordem
FROM opcoes o
JOIN perguntas p ON p.id = o.pergunta_id
WHERE p.quiz_id = (SELECT id FROM quizzes WHERE slug = 'codigo-da-unha')
ORDER BY p.ordem, o.texto;

SELECT
  'Bloco resultado' as info,
  config->>'tipo' as tipo,
  jsonb_object_keys(config->'categorias') as categoria
FROM blocos
WHERE quiz_id = (SELECT id FROM quizzes WHERE slug = 'codigo-da-unha')
  AND tipo = 'resultado';
