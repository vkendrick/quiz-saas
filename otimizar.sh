#!/bin/bash
set -e

echo ""
echo "🚀 Quiz SaaS — V2 (Resultado por Categoria)"
echo "============================================"
echo ""

# ============================================================
# 1. BACKUP
# ============================================================
echo "📦 1/4 — Fazendo backup dos arquivos..."
cp components/quiz/QuizEngine.jsx components/quiz/QuizEngine.jsx.bak 2>/dev/null || true
cp components/quiz/blocos/BlocoResultado.jsx components/quiz/blocos/BlocoResultado.jsx.bak 2>/dev/null || true
echo "  ✅ Backups criados (.bak)"
echo ""

# ============================================================
# 2. ATUALIZAR QuizEngine.jsx (surgical edit)
# ============================================================
echo "📁 2/4 — Atualizando QuizEngine.jsx..."

node -e "
const fs = require('fs');
const path = 'components/quiz/QuizEngine.jsx';
let content = fs.readFileSync(path, 'utf8');
let mudou = false;

// 2.1 — Adicionar helper calcularCategoriaVencedora depois de calcularScore
if (!content.includes('calcularCategoriaVencedora')) {
  const helper = \`
  // 🔽 V2 — Calcula a categoria (fungo, encravada, trauma, fragilidade) vencedora
  const calcularCategoriaVencedora = () => {
    const pontos = {};
    blocos.forEach(b => {
      if (b.tipo !== 'pergunta' || !b.pergunta) return;
      const resposta = respostas[b.pergunta.id];
      if (!resposta) return;
      const ids = Array.isArray(resposta) ? resposta : [resposta];
      ids.forEach(opId => {
        const op = b.pergunta.opcoes?.find(o => o.id === opId);
        const cat = op?.metadata?.categoria;
        if (cat) pontos[cat] = (pontos[cat] || 0) + (op.valor || 0);
      });
    });
    const entries = Object.entries(pontos).sort((a, b) => b[1] - a[1]);
    return entries[0]?.[0] || null;
  };
\`;

  // Insere depois do fechamento de calcularScore
  const regex = /(const calcularScore = \(\) => \{[\s\S]*?\n  \};)\n/;
  if (regex.test(content)) {
    content = content.replace(regex, '\$1\n' + helper);
    mudou = true;
    console.log('  ✅ Helper calcularCategoriaVencedora adicionado');
  } else {
    console.log('  ⚠️  Não achei calcularScore — verifica o arquivo manualmente');
  }
} else {
  console.log('  ⏭️  Helper já existe');
}

// 2.2 — Trocar o case 'resultado' pra passar categoriaVencedora
const oldCase = \`      case 'resultado':
        return <BlocoResultado {...props} score={score} leadId={leadId} respostas={respostas} />;\`;

const newCase = \`      case 'resultado':
        return <BlocoResultado {...props} score={score} leadId={leadId} respostas={respostas} categoriaVencedora={calcularCategoriaVencedora()} />;\`;

if (content.includes(oldCase)) {
  content = content.replace(oldCase, newCase);
  mudou = true;
  console.log('  ✅ Case resultado atualizado');
} else if (content.includes('categoriaVencedora={calcularCategoriaVencedora()}')) {
  console.log('  ⏭️  Case já estava atualizado');
} else {
  console.log('  ⚠️  Não achei o case resultado exato — verifica manualmente');
}

if (mudou) {
  fs.writeFileSync(path, content);
  console.log('  ✅ QuizEngine.jsx salvo');
}
"

echo ""

# ============================================================
# 3. REESCREVER BlocoResultado.jsx (2 modos)
# ============================================================
echo "📁 3/4 — Reescrevendo BlocoResultado.jsx..."

cat > components/quiz/blocos/BlocoResultado.jsx <<'EOF'
'use client';
import { motion } from 'framer-motion';
import Botao from '../ui/Botao';
import TextoRico from '../ui/TextoRico';

export default function BlocoResultado({
  config = {},
  tema = {},
  score = 0,
  avancar,
  categoriaVencedora = null
}) {
  // 🔽 V2 — Detecta se é modo por categoria ou por score
  const isCategoria = config.tipo === 'por_categoria';

  let resultado = null;

  if (isCategoria && config.categorias) {
    // Modo por CATEGORIA (V2)
    const cat = categoriaVencedora ? config.categorias[categoriaVencedora] : null;
    const fallback = config.categorias[Object.keys(config.categorias)[0]];

    const escolhido = cat || fallback;
    if (escolhido) {
      resultado = {
        titulo: escolhido.titulo,
        texto: escolhido.texto,
        imagem_url: escolhido.imagem_url,
        cta_url: escolhido.cta_url,
        cta_texto: escolhido.cta_texto,
        badge: escolhido.badge || 'Diagnóstico completo'
      };
    }
  } else {
    // Modo por SCORE (padrão antigo)
    const faixas = config.faixas || [];
    const faixa = faixas.find(f => score >= (f.min ?? 0) && score <= (f.max ?? 9999))
      || faixas[faixas.length - 1];

    if (faixa) {
      resultado = {
        titulo: faixa.titulo,
        texto: faixa.texto,
        imagem_url: faixa.imagem_url,
        cta_url: faixa.cta_url,
        cta_texto: faixa.cta_texto,
        badge: faixa.badge || 'Diagnóstico completo'
      };
    }
  }

  const cor = tema.ctaCor || tema.destaque || '#0EA5E9';
  const mostrarGraficoFinal = config.grafico_final === true;

  return (
    <div>
      {resultado ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{
              display: 'inline-block',
              fontSize: 12, fontWeight: 700, letterSpacing: 1,
              textTransform: 'uppercase',
              padding: '6px 14px',
              background: `${cor}15`,
              color: cor,
              borderRadius: 999,
              marginBottom: 16
            }}>
              {resultado.badge}
            </div>

            <TextoRico
              texto={resultado.titulo}
              tema={tema}
              as="h2"
              style={{
                fontSize: tema.titulo?.resultado?.mobileSize || '26px',
                fontWeight: 800,
                color: tema.destaque,
                lineHeight: 1.25,
                marginBottom: 0
              }}
            />
          </div>

          {resultado.texto && (
            <TextoRico
              texto={resultado.texto}
              tema={tema}
              style={{
                fontSize: 16,
                color: tema.texto,
                lineHeight: 1.65,
                marginBottom: 24,
                textAlign: 'left'
              }}
            />
          )}

          {resultado.imagem_url && (
            <img
              src={resultado.imagem_url}
              alt=""
              width={600}
              height={400}
              loading="lazy"
              decoding="async"
              style={{
                width: '100%', height: 'auto', borderRadius: 16,
                marginBottom: 24, display: 'block'
              }}
            />
          )}

          {/* Gráfico evolutivo dentro do resultado */}
          {mostrarGraficoFinal && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{
                background: '#FFF',
                border: `1px solid ${tema.cardBorda || '#E5E7EB'}`,
                borderRadius: 14,
                padding: '40px 20px 36px',
                marginBottom: 24,
                position: 'relative',
                height: 240
              }}
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{
                  position: 'absolute',
                  left: 20, right: 20, top: 30, bottom: 30,
                  width: 'calc(100% - 40px)',
                  height: 'calc(100% - 60px)'
                }}
              >
                <defs>
                  <linearGradient id="gradRes" x1="0" x2="1">
                    <stop offset="0%" stopColor="#EF4444" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0 100 Q 30 85, 50 55 T 100 5"
                  stroke="#E5E7EB"
                  strokeWidth="3"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                />
                <motion.path
                  d="M 0 100 Q 30 85, 50 55 T 100 5"
                  stroke="url(#gradRes)"
                  strokeWidth="3"
                  fill="none"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.4, ease: [0.32, 0.72, 0, 1] }}
                />
              </svg>

              <div style={{
                position: 'absolute',
                left: '25%', top: '75%',
                transform: 'translate(-50%, -50%)'
              }}>
                <div style={{
                  background: cor, color: '#FFF',
                  padding: '4px 10px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700,
                  whiteSpace: 'nowrap', marginBottom: 4
                }}>Você hoje</div>
                <div style={{
                  width: 12, height: 12, background: cor,
                  borderRadius: '50%', margin: '0 auto',
                  border: '3px solid #FFF',
                  boxShadow: `0 0 0 2px ${cor}`
                }} />
              </div>

              <div style={{
                position: 'absolute',
                left: '90%', top: '15%',
                transform: 'translate(-50%, -50%)'
              }}>
                <div style={{
                  background: '#10B981', color: '#FFF',
                  padding: '4px 10px', borderRadius: 8,
                  fontSize: 11, fontWeight: 700,
                  whiteSpace: 'nowrap', marginBottom: 4
                }}>Com o protocolo</div>
                <div style={{
                  width: 12, height: 12, background: '#10B981',
                  borderRadius: '50%', margin: '0 auto',
                  border: '3px solid #FFF',
                  boxShadow: '0 0 0 2px #10B981'
                }} />
              </div>
            </motion.div>
          )}

          {!resultado.cta_url && (
            <Botao onClick={avancar} tema={tema} variant="primario">
              {config.cta || 'Continuar'}
            </Botao>
          )}

          {resultado.cta_url && (
            <a
              href={resultado.cta_url}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                padding: tema.botaoPaddingMobile || tema.botaoPadding || '18px 24px',
                background: cor,
                color: tema.modoEscuro ? tema.fundo : '#FFFFFF',
                borderRadius: tema.botaoRaio || 14,
                fontWeight: 700,
                fontSize: 17,
                textDecoration: 'none',
                boxShadow: tema.botaoSombra || '0 4px 12px rgba(0,0,0,0.1)'
              }}
            >
              {resultado.cta_texto || 'Continuar'}
            </a>
          )}
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {config.titulo || 'Obrigado!'}
          </h2>
          <p style={{ color: tema.textoSuave }}>
            {config.subtitulo || 'Recebemos suas respostas.'}
          </p>
        </div>
      )}

      {config.html_livre && (
        <div
          style={{ marginTop: 32 }}
          dangerouslySetInnerHTML={{ __html: config.html_livre }}
        />
      )}
    </div>
  );
}
EOF

echo "  ✅ BlocoResultado.jsx reescrito (2 modos)"
echo ""

# ============================================================
# 4. GERAR arquivo SQL da V2 (Código da Unha)
# ============================================================
echo "📁 4/4 — Gerando arquivo SQL da V2..."

cat > unha-v2.sql <<'SQLEOF'
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
SQLEOF

echo "  ✅ Arquivo unha-v2.sql gerado"
echo ""

# ============================================================
# RESUMO
# ============================================================
echo ""
echo "════════════════════════════════════════════════════"
echo "🎉 V2 aplicada com sucesso!"
echo "════════════════════════════════════════════════════"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. Rodar o SQL gerado:"
echo "   → Copia o conteúdo de unha-v2.sql"
echo "   → Cola no Supabase → SQL Editor → Run"
echo ""
echo "2. Build local pra validar:"
echo "   npm run build"
echo ""
echo "3. Push:"
echo "   git add ."
echo "   git commit -m 'feat: V2 - resultado por categoria (backward compatible)'"
echo "   git push"
echo ""
echo "4. Cloudflare → Caching → Purge Everything"
echo ""
echo "5. Testa em:"
echo "   https://quiz-saas.vjprismadigital.workers.dev/quiz/codigo-da-unha"
echo ""
echo "════════════════════════════════════════════════════"
echo ""
echo "⚠️  IMPORTANTE — V2 é OPCIONAL nos outros quizzes:"
echo ""
echo "   Os 6 quizzes anteriores continuam funcionando com"
echo "   resultado POR SCORE (modo antigo). Pra ativar V2"
echo "   em outro quiz, basta:"
echo ""
echo "   a) Adicionar categoria no metadata das opções"
echo "   b) Trocar config do bloco resultado para 'por_categoria'"
echo ""
echo "   Nada muda automaticamente. Só o codigo-da-unha tem V2."
echo ""
echo "════════════════════════════════════════════════════"
echo ""