'use client';
import { useEffect, useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { getQuizCompleto } from '@/lib/quiz2';
import { montarTema } from '@/lib/design/presets';
import { track, salvarLead } from '@/lib/tracking';
import { dispararEvento } from '@/lib/pixels';
import Pixels from '@/components/Pixels';

import LogoTopo from './LogoTopo';
import TelaFundo from './TelaFundo';
import Rodape from './Rodape';
import BarraProgresso from './ui/BarraProgresso';
import BlocoErrorBoundary from './BlocoErrorBoundary';

const BlocoIntro = dynamic(() => import('./blocos/BlocoIntro'), { ssr: false });
const BlocoPergunta = dynamic(() => import('./blocos/BlocoPergunta'), { ssr: false });
const BlocoConteudo = dynamic(() => import('./blocos/BlocoConteudo'), { ssr: false });
const BlocoProvaSocial = dynamic(() => import('./blocos/BlocoProvaSocial'), { ssr: false });
const BlocoLoading = dynamic(() => import('./blocos/BlocoLoading'), { ssr: false });
const BlocoCaptura = dynamic(() => import('./blocos/BlocoCaptura'), { ssr: false });
const BlocoResultado = dynamic(() => import('./blocos/BlocoResultado'), { ssr: false });
const BlocoHTML = dynamic(() => import('./blocos/BlocoHTML'), { ssr: false });
const BlocoAntesDepois = dynamic(() => import('./blocos/BlocoAntesDepois'), { ssr: false });
const BlocoOferta = dynamic(() => import('./blocos/BlocoOferta'), { ssr: false });
const BlocoGrafico = dynamic(() => import('./blocos/BlocoGrafico'), { ssr: false });
const RelatorioDiagnostico = dynamic(() => import('./blocos/RelatorioDiagnostico'), { ssr: false });

// Cache em memória — fora do componente, propositalmente
const cache = new Map();

export default function QuizEngine({ slug }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [blocos, setBlocos] = useState([]);
  const [indiceAtual, setIndiceAtual] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [leadId, setLeadId] = useState(null);
  const [score, setScore] = useState(0);
  const [direcao, setDirecao] = useState(1);

  const isPreview = () => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).has('preview');
  };

  useEffect(() => {
    const preview = isPreview();
    const cacheKey = `quiz-${slug}`;

    const carregarQuiz = async () => {
      let q = null;
      let b = null;

      // 1. Tenta do cache (só os dados, sem pular tracking)
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
          q = cached.quiz;
          b = cached.blocos;
        }
      }

      // 2. Se não tinha no cache, busca do banco
      if (!q || !b) {
        try {
          const result = await getQuizCompleto(slug);
          q = result.quiz;
          b = result.blocos;
          cache.set(cacheKey, { quiz: q, blocos: b, timestamp: Date.now() });
        } catch (e) {
          setErro(e.message);
          setCarregando(false);
          return;
        }
      }

      // 3. Aplica os dados no estado
      setQuiz(q);
      setBlocos(b);

      // 4. Se tem pular_intro, começa do primeiro bloco não-intro
      if (q.pular_intro) {
        const idx = b.findIndex(x => x.tipo !== 'intro');
        if (idx > 0) setIndiceAtual(idx);
      }

      // 5. SEMPRE dispara tracking (mesmo vindo do cache)
      if (q?.id && !preview) {
        track(q.id, 'view');
        dispararEvento('quiz_view', { quiz: q.slug });
        setTimeout(() => {
          track(q.id, 'inicio');
          dispararEvento('quiz_inicio', { quiz: q.slug });
        }, 500);
      }

      setCarregando(false);
    };

    carregarQuiz();
  }, [slug]);

  const tema = useMemo(() => {
    if (!quiz) return {};
    return montarTema({
      preset_tema: quiz.preset_tema,
      paleta_id: quiz.paleta_id,
      fonte_id: quiz.fonte_id,
      cor_cta: quiz.cor_cta,
      tema_overrides: quiz.tema_overrides || {},
      cliente_nome: quiz.cliente_nome,
      cliente_logo_url: quiz.cliente_logo_url,
      rodape_texto: quiz.rodape_texto,
      rodape_html: quiz.rodape_html
    });
  }, [quiz]);

  const blocoAtual = blocos[indiceAtual];
  const progresso = blocos.length > 0
    ? Math.round((indiceAtual / blocos.length) * 100)
    : 0;

  const calcularScore = () => {
    let total = 0;
    blocos.forEach(b => {
      if (b.tipo !== 'pergunta' || !b.pergunta) return;
      const resposta = respostas[b.pergunta.id];
      if (!resposta) return;

      if (Array.isArray(resposta)) {
        resposta.forEach(opId => {
          const op = b.pergunta.opcoes?.find(o => o.id === opId);
          if (op) total += op.valor || 0;
        });
      } else {
        const op = b.pergunta.opcoes?.find(o => o.id === resposta);
        if (op) total += op.valor || 0;
      }
    });
    return total;
  };

  useEffect(() => {
    console.log('[QuizEngine] blocoAtual mudou para:', blocoAtual?.tipo);
  }, [blocoAtual]);

  // Dispara conclusao quando chega na tela de oferta
  useEffect(() => {
    if (!blocoAtual || !quiz?.id) return;
    if (blocoAtual.tipo !== 'oferta') return;
    if (isPreview()) return;

    // Só dispara uma vez por sessão
    const chave = `conclusao-disparada-${quiz.id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(chave)) return;
    if (typeof window !== 'undefined') sessionStorage.setItem(chave, '1');

    track(quiz.id, 'conclusao');
    dispararEvento('quiz_conclusao', { quiz: quiz.slug });
    try { window.fbq?.('track', 'CompleteRegistration'); } catch {}
    try { window.gtag?.('event', 'quiz_conclusao'); } catch {}
  }, [blocoAtual, quiz]);

  // Cria lead anônimo quando não tiver captura
  useEffect(() => {
    // Só executa quando o bloco atual for 'oferta'
    if (!blocoAtual || !quiz?.id) return;
    if (blocoAtual.tipo !== 'oferta') return;
    if (isPreview()) return;

    // Só se o quiz NÃO tiver captura
    if (!quiz.pular_captura) return;

    // Evita criar mais de uma vez por sessão
    const chave = `lead-anonimo-criado-${quiz.id}`;
    if (typeof window !== 'undefined' && sessionStorage.getItem(chave)) return;
    if (typeof window !== 'undefined') sessionStorage.setItem(chave, '1');

    console.log('[QuizEngine] Criando lead anônimo...');

    // Cria o lead anônimo
    salvarLead({
      quiz_id: quiz.id,
      nome: 'Anônimo',
      email: null,
      telefone: null,
      respostas,
      score: calcularScore(),
      status_pipeline: 'foi_checkout'
    })
    .then(lead => {
      console.log('[QuizEngine] ✅ Lead anônimo criado:', lead);
      if (lead?.id) setLeadId(lead.id);
    })
    .catch(err => {
      console.error('[QuizEngine] ❌ Erro ao criar lead anônimo:', err);
      // Se falhar, remove a trava pra tentar de novo
      if (typeof window !== 'undefined') sessionStorage.removeItem(chave);
    });
  }, [blocoAtual, quiz]);

  const avancar = () => {
    setDirecao(1);
    if (indiceAtual < blocos.length - 1) {
      setIndiceAtual(indiceAtual + 1);
    }
  };

  const voltar = () => {
    if (indiceAtual > 0) {
      setDirecao(-1);
      setIndiceAtual(indiceAtual - 1);
    }
  };

const registrarResposta = (perguntaId, opcaoOuIds, info) => {
  const preview = isPreview();

  let novoValor;
  let valorAgregado = 0;

  // Detecta múltipla (array de ids)
  if (Array.isArray(opcaoOuIds)) {
    novoValor = opcaoOuIds;
    valorAgregado = info?.valor_agregado || 0;
  } else {
    novoValor = opcaoOuIds;
    // Soma o valor da opção única
    const pergunta = blocos.find(b => b.tipo === 'pergunta' && b.pergunta?.id === perguntaId)?.pergunta;
    const opcao = pergunta?.opcoes?.find(o => o.id === opcaoOuIds);
    valorAgregado = opcao?.valor || 0;
  }

  const novas = { ...respostas, [perguntaId]: novoValor };
  setRespostas(novas);

  if (quiz?.id && !preview) {
    // Se for múltipla, registra um evento por opção
    if (Array.isArray(opcaoOuIds)) {
      opcaoOuIds.forEach(id => {
        track(quiz.id, 'resposta', { pergunta_id: perguntaId, opcao_id: id });
      });
    } else {
      track(quiz.id, 'resposta', { pergunta_id: perguntaId, opcao_id: opcaoOuIds });
    }
  }

  // Se a pergunta única tem branching, respeita
  if (!Array.isArray(opcaoOuIds) && info?.proxima_pergunta) {
    const idx = blocos.findIndex(b =>
      b.tipo === 'pergunta' && b.pergunta?.id === info.proxima_pergunta
    );
    if (idx >= 0) {
      setDirecao(1);
      setIndiceAtual(idx);
      return;
    }
  }

  // Avança
  avancar();
};


const registrarLead = async (dados) => {
  console.log('[QuizEngine] registrarLead iniciado:', dados);

  const preview = isPreview();
  const scoreCalculado = calcularScore();

  let lead;
  try {
    lead = await salvarLead({
      quiz_id: quiz.id,
      nome: dados.nome,
      email: dados.email,
      telefone: dados.telefone,
      respostas,
      score: scoreCalculado
    });
    console.log('[QuizEngine] lead salvo com sucesso:', lead);
  } catch (err) {
    console.error('[QuizEngine] erro ao salvar lead:', err);
    throw new Error('Não conseguimos salvar seus dados: ' + err.message);
  }

  if (!lead || !lead.id) {
    console.error('[QuizEngine] salvarLead retornou sem id:', lead);
    throw new Error('Resposta inválida do servidor');
  }

  setLeadId(lead.id);
  setScore(scoreCalculado);

  // Tracking do lead (conclusao dispara ao chegar na oferta)
  try {
    if (quiz?.id && !preview) {
      dispararEvento('quiz_lead', { quiz: quiz.slug, score: scoreCalculado });
      try { window.fbq?.('track', 'Lead'); } catch {}
      try { window.gtag?.('event', 'generate_lead', { value: scoreCalculado }); } catch {}
    }
  } catch (err) {
    console.warn('[QuizEngine] tracking falhou (não crítico):', err);
  }

  // ✅ ESSA LINHA FALTAVA — avança pro próximo bloco (oferta)
  avancar();
};

  const renderizarBloco = () => {
    if (!blocoAtual) return null;

    const props = {
      config: blocoAtual.config || {},
      tema,
      quiz,
      avancar,
      voltar,
      indiceAtual,
      totalBlocos: blocos.length
    };

    switch (blocoAtual.tipo) {
      case 'intro':
        return <BlocoIntro {...props} />;

      case 'pergunta':
        return (
          <BlocoPergunta
            {...props}
            pergunta={blocoAtual.pergunta}
            respostas={respostas}
            onResponder={(opcaoId, opcao) =>
              registrarResposta(blocoAtual.pergunta.id, opcaoId, opcao)
            }
          />
        );

      case 'conteudo':
        return <BlocoConteudo {...props} />;

      case 'prova_social':
        return <BlocoProvaSocial {...props} />;

      case 'loading':
        return <BlocoLoading {...props} />;

      case 'captura':
        return <BlocoCaptura {...props} onEnviar={registrarLead} />;

      case 'resultado':
        return <BlocoResultado {...props} score={score} leadId={leadId} respostas={respostas} />;

      case 'html':
        return <BlocoHTML {...props} />;

      case 'antes_depois':
        return <BlocoAntesDepois {...props} />;

      case 'oferta':
        return <BlocoOferta {...props} leadId={leadId} />;

case 'relatorio_diagnostico':
  return <RelatorioDiagnostico {...props} />;

case 'grafico': {
  const scoreMaximo = blocos.reduce((acc, b) => {
    if (b.tipo !== 'pergunta' || !b.pergunta) return acc;
    const valores = (b.pergunta.opcoes || []).map(o => o.valor || 0);
    if (b.pergunta.tipo === 'multipla') {
      // Múltipla: soma dos 3 maiores valores (aproximação)
      const top = valores.sort((a, b) => b - a).slice(0, 3);
      return acc + top.reduce((s, v) => s + v, 0);
    }
    // Única: maior valor
    return acc + Math.max(...valores, 0);
  }, 0);
  return <BlocoGrafico {...props} score={calcularScore()} scoreMaximo={scoreMaximo} />;
}

      default:
        return null;
    }
  };

  if (carregando) return <TelaCarregando />;
  if (erro) return <TelaErro erro={erro} />;
  if (!quiz || blocos.length === 0) {
    return <TelaErro erro="Esse quiz ainda não tem blocos configurados." />;
  }

  return (
    <TelaFundo tema={tema}>
      <LogoTopo tema={tema} quiz={quiz} />
      <Pixels integracoes={quiz.integracoes} />
      <BarraProgresso progresso={progresso} tema={tema} />
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px'
        }}
      >
        <div style={{ width: '100%', maxWidth: tema.maxLargura || '560px' }}>
          <AnimatePresence mode="wait" custom={direcao}>
            <motion.div
              key={blocoAtual.id}
              custom={direcao}
              initial={{ opacity: 0, x: direcao * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direcao * -30 }}
              transition={{
                duration: tema.animacao?.duracao || 0.28,
                ease: [0.32, 0.72, 0, 1]
              }}
            >
              <BlocoErrorBoundary>
                {renderizarBloco()}
              </BlocoErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Rodape tema={tema} />
    </TelaFundo>
  );
}

function TelaCarregando() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#F9FAFB'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, border: '4px solid #E5E7EB',
          borderTopColor: '#111827', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <span style={{ fontSize: 14, color: '#6B7280' }}>Carregando quiz...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

function TelaErro({ erro }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: '#F9FAFB', padding: 24
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
          Ops, algo deu errado
        </h2>
        <p style={{ fontSize: 14, color: '#6B7280' }}>{erro}</p>
      </div>
    </div>
  );
}