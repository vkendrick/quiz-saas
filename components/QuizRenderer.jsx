'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { getQuiz, escolherVariante, registrarAbAtribuicao } from '@/lib/quiz';
import { track, salvarLead, getSessaoId } from '@/lib/tracking';
import { dispararEvento } from '@/lib/pixels';
import Pixels from './Pixels';
import ResultadoPagina from './ResultadoPagina';

export default function QuizRenderer({ slug }) {
  const [quiz, setQuiz] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const [etapa, setEtapa] = useState('intro'); // intro | quiz | lead | resultado
  const [perguntaAtual, setPerguntaAtual] = useState(null);
  const [varianteAtual, setVarianteAtual] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [historico, setHistorico] = useState([]); // pilha de ids de pergunta
  const [inicioPergunta, setInicioPergunta] = useState(Date.now());
  const [leadSalvo, setLeadSalvo] = useState(null);
  const [formLead, setFormLead] = useState({ nome: '', email: '', telefone: '' });
  const [animKey, setAnimKey] = useState(0); // força reanimação

  const mapaPerguntas = useMemo(
    () => quiz ? Object.fromEntries(quiz.perguntas.map(p => [p.id, p])) : {},
    [quiz]
  );

  useEffect(() => {
    getQuiz(slug)
      .then(q => {
        setQuiz(q);
        const primeira = q.perguntas[0];
        setPerguntaAtual(primeira);
        const sessao = getSessaoId();
        const v = escolherVariante(primeira, sessao);
        setVarianteAtual(v);
        registrarAbAtribuicao(q.id, sessao, primeira.id, v.variante);
        track(q.id, 'view');
        dispararEvento('quiz_view', { quiz: q.slug });
      })
      .catch(e => setErro(e.message))
      .finally(() => setCarregando(false));
  }, [slug]);

  if (carregando) return <TelaCarregando />;
  if (erro) return <div className="p-10 text-center text-red-500">Erro: {erro}</div>;
  if (!quiz || !perguntaAtual) return <div className="p-10 text-center">Quiz vazio.</div>;

  const tema = quiz.tema || {};
  const cor = tema.primary || '#6366F1';
  const bg = tema.bg || '#FAFAFA';
  const texto = tema.texto || '#111827';

  /* ============ AÇÕES ============ */

  const comecarQuiz = () => {
    track(quiz.id, 'inicio');
    dispararEvento('quiz_inicio', { quiz: quiz.slug });
    setEtapa('quiz');
    setInicioPergunta(Date.now());
    setAnimKey(k => k + 1);
  };

  const responder = (opcao) => {
    const tempo_ms = Date.now() - inicioPergunta;
    track(quiz.id, 'resposta', {
      pergunta_id: perguntaAtual.id,
      opcao_id: opcao.id,
      tempo_ms,
      variante: varianteAtual?.variante || null
    });
    dispararEvento('quiz_responder', {
      quiz: quiz.slug, pergunta: perguntaAtual.id, opcao: opcao.texto
    });

    const novas = { ...respostas, [perguntaAtual.id]: opcao.id };
    setRespostas(novas);
    const novoHist = [...historico, perguntaAtual.id];
    setHistorico(novoHist);

    // Decide próxima
    let proxima = null;
    if (opcao.proxima_pergunta && mapaPerguntas[opcao.proxima_pergunta]) {
      proxima = mapaPerguntas[opcao.proxima_pergunta];
    } else {
      proxima = quiz.perguntas.find(
        p => p.ordem > perguntaAtual.ordem && !novoHist.includes(p.id) && p.id !== perguntaAtual.id
      ) || null;
    }

    if (proxima) {
      const sessao = getSessaoId();
      const v = escolherVariante(proxima, sessao);
      setVarianteAtual(v);
      registrarAbAtribuicao(quiz.id, sessao, proxima.id, v.variante);
      setPerguntaAtual(proxima);
      setInicioPergunta(Date.now());
      setAnimKey(k => k + 1);
    } else {
      track(quiz.id, 'conclusao');
      dispararEvento('quiz_conclusao', { quiz: quiz.slug });
      setEtapa('lead');
      setAnimKey(k => k + 1);
    }
  };

  const voltar = () => {
    if (historico.length === 0) return;
    const anterior = mapaPerguntas[historico[historico.length - 1]];
    if (!anterior) return;
    setPerguntaAtual(anterior);
    setHistorico(historico.slice(0, -1));
    setInicioPergunta(Date.now());
    setAnimKey(k => k + 1);
  };

  const calcularScore = () => {
    return Object.values(respostas).reduce((acc, opcaoId) => {
      for (const p of quiz.perguntas) {
        const op = p.opcoes.find(o => o.id === opcaoId);
        if (op) return acc + (op.valor || 0);
      }
      return acc;
    }, 0);
  };

  const enviarLead = async (e) => {
    e.preventDefault();
    const score = calcularScore();
    const lead = await salvarLead({
      quiz_id: quiz.id,
      nome: formLead.nome,
      email: formLead.email,
      telefone: formLead.telefone,
      respostas,
      score
    });
    setLeadSalvo(lead);
    dispararEvento('quiz_lead', { quiz: quiz.slug, score });
    try { window.fbq?.('track', 'Lead'); } catch {}
    try { window.gtag?.('event', 'generate_lead', { value: score }); } catch {}
    setEtapa('resultado');
    setAnimKey(k => k + 1);
  };

  const textoPergunta = varianteAtual?.texto || perguntaAtual.texto;
  const totalPerguntas = quiz.perguntas.length;
  const progresso = etapa === 'quiz'
    ? Math.min(100, Math.round((historico.length / totalPerguntas) * 100))
    : etapa === 'intro' ? 0 : 100;

  /* ============ RENDER ============ */

  return (
    <div className="min-h-screen flex flex-col" style={{ background: bg, color: texto }}>
      <Pixels integracoes={quiz.integracoes} />

      {/* Barra de progresso fixa */}
      {etapa !== 'intro' && (
        <div className="w-full h-1.5 bg-black/5">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{ width: `${progresso}%`, background: cor }}
          />
        </div>
      )}

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-16">
        <div className="w-full max-w-xl">

          {/* ============ INTRO ============ */}
          {etapa === 'intro' && (
            <div key={animKey} className="animate-[fadeIn_0.5s_ease-out] text-center">
              {quiz.intro_imagem_url && (
                <img
                  src={quiz.intro_imagem_url}
                  alt=""
                  className="w-full max-w-sm mx-auto rounded-2xl mb-6 shadow-lg"
                />
              )}

              <h1
                className="text-3xl sm:text-4xl font-bold leading-tight mb-4"
                style={{ color: cor }}
              >
                {quiz.intro_titulo || quiz.titulo}
              </h1>

              {(quiz.intro_subtitulo || quiz.subtitulo) && (
                <p className="text-base sm:text-lg text-gray-600 mb-8 leading-relaxed">
                  {quiz.intro_subtitulo || quiz.subtitulo}
                </p>
              )}

              <button
                onClick={comecarQuiz}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                style={{ background: cor }}
              >
                {quiz.intro_cta || 'Começar agora'}
              </button>

              <p className="text-xs text-gray-400 mt-6">
                Leva menos de 1 minuto · 100% gratuito
              </p>
            </div>
          )}

          {/* ============ QUIZ ============ */}
          {etapa === 'quiz' && (
            <div key={animKey} className="animate-[fadeSlide_0.35s_ease-out]">
              <div className="flex justify-between items-center mb-6">
                {historico.length > 0 ? (
                  <button
                    onClick={voltar}
                    className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition"
                  >
                    ← Voltar
                  </button>
                ) : <div />}
                <span className="text-xs font-medium text-gray-400">
                  {historico.length + 1} de {totalPerguntas}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold leading-snug mb-8" style={{ color: texto }}>
                {textoPergunta}
              </h2>

              {perguntaAtual.imagem_url && (
                <img
                  src={perguntaAtual.imagem_url}
                  className="rounded-2xl mb-6 w-full shadow-sm"
                  alt=""
                />
              )}

              <div className="space-y-3">
                {perguntaAtual.opcoes.map((op, idx) => (
                  <button
                    key={op.id}
                    onClick={() => responder(op)}
                    className="group w-full text-left px-5 py-4 rounded-2xl bg-white border-2 border-gray-200 hover:border-current hover:shadow-md active:scale-[0.99] transition-all flex items-center gap-4"
                    style={{ '--hover-color': cor }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = cor}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E7EB'}
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition"
                      style={{ background: `${cor}15`, color: cor }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="flex-1 font-medium text-base">{op.texto}</span>
                    <span
                      className="opacity-0 group-hover:opacity-100 transition text-lg"
                      style={{ color: cor }}
                    >
                      →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ============ LEAD FORM ============ */}
          {etapa === 'lead' && (
            <div key={animKey} className="animate-[fadeSlide_0.35s_ease-out]">
              <div className="text-center mb-8">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
                  style={{ background: `${cor}15` }}
                >
                  🎉
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: cor }}>
                  Tudo pronto!
                </h2>
                <p className="text-gray-600">
                  Deixe seus dados para ver o resultado personalizado.
                </p>
              </div>

              <form
                onSubmit={enviarLead}
                className="bg-white rounded-2xl p-6 shadow-lg space-y-4"
              >
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">Seu nome</span>
                  <input
                    required
                    value={formLead.nome}
                    onChange={e => setFormLead({ ...formLead, nome: e.target.value })}
                    placeholder="Como podemos te chamar?"
                    className="mt-1 w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-current outline-none transition"
                    style={{ '--tw-ring-color': cor }}
                    onFocus={e => e.target.style.borderColor = cor}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">E-mail</span>
                  <input
                    required
                    type="email"
                    value={formLead.email}
                    onChange={e => setFormLead({ ...formLead, email: e.target.value })}
                    placeholder="seu@email.com"
                    className="mt-1 w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-current outline-none transition"
                    onFocus={e => e.target.style.borderColor = cor}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    WhatsApp <span className="text-gray-400 font-normal">(opcional)</span>
                  </span>
                  <input
                    value={formLead.telefone}
                    onChange={e => setFormLead({ ...formLead, telefone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    className="mt-1 w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-current outline-none transition"
                    onFocus={e => e.target.style.borderColor = cor}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                  />
                </label>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
                  style={{ background: cor }}
                >
                  Ver meu resultado →
                </button>

                <p className="text-xs text-gray-400 text-center">
                  🔒 Seus dados estão seguros. Não enviamos spam.
                </p>
              </form>
            </div>
          )}

          {/* ============ RESULTADO ============ */}
          {etapa === 'resultado' && leadSalvo && (
            <div key={animKey} className="animate-[fadeSlide_0.35s_ease-out]">
              <ResultadoPagina quiz={quiz} score={leadSalvo.score} lead={leadSalvo} />
            </div>
          )}
        </div>
      </main>

      {/* Rodapé */}
      <footer className="text-center text-xs text-gray-400 py-6">
        © {new Date().getFullYear()} · {quiz.titulo}
      </footer>

      {/* Animações CSS */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function TelaCarregando() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-sm text-gray-500">Carregando quiz...</span>
      </div>
    </div>
  );
}