'use client';
import { useEffect, useState, useMemo } from 'react';
import { getQuiz, escolherVariante, registrarAbAtribuicao } from '@/lib/quiz';
import { track, salvarLead, getSessaoId } from '@/lib/tracking';
import { dispararEvento } from '@/lib/pixels';
import Pixels from './Pixels';
import ResultadoPagina from './ResultadoPagina';

export default function QuizRenderer({ slug }) {
  const [quiz, setQuiz] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [perguntaAtual, setPerguntaAtual] = useState(null);
  const [varianteAtual, setVarianteAtual] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [historico, setHistorico] = useState([]);
  const [inicioPergunta, setInicioPergunta] = useState(Date.now());
  const [finalizado, setFinalizado] = useState(false);
  const [leadSalvo, setLeadSalvo] = useState(null);
  const [formLead, setFormLead] = useState({ nome: '', email: '', telefone: '' });

  const mapaPerguntas = useMemo(() => quiz ? Object.fromEntries(quiz.perguntas.map(p => [p.id, p])) : {}, [quiz]);

  useEffect(() => {
    getQuiz(slug).then(q => {
      setQuiz(q);
      const primeira = q.perguntas[0];
      setPerguntaAtual(primeira);
      const sessao = getSessaoId();
      const v = escolherVariante(primeira, sessao);
      setVarianteAtual(v);
      registrarAbAtribuicao(q.id, sessao, primeira.id, v.variante);
      track(q.id, 'view'); track(q.id, 'inicio');
      dispararEvento('quiz_view', { quiz: q.slug });
    }).catch(e => setErro(e.message)).finally(() => setCarregando(false));
  }, [slug]);

  if (carregando) return <div className="p-10 text-center text-gray-500">Carregando quiz...</div>;
  if (erro) return <div className="p-10 text-center text-red-500">Erro: {erro}</div>;
  if (!quiz || !perguntaAtual) return <div className="p-10 text-center">Quiz vazio.</div>;

  const tema = quiz.tema || {};
  const progresso = Math.min(100, Math.round((historico.length / Math.max(quiz.perguntas.length, 1)) * 100));

  const responder = async (opcao) => {
    const tempo_ms = Date.now() - inicioPergunta;
    track(quiz.id, 'resposta', {
      pergunta_id: perguntaAtual.id, opcao_id: opcao.id, tempo_ms,
      variante: varianteAtual?.variante || null
    });
    dispararEvento('quiz_responder', { quiz: quiz.slug, pergunta: perguntaAtual.id, opcao: opcao.texto });

    const novasRespostas = { ...respostas, [perguntaAtual.id]: opcao.id };
    setRespostas(novasRespostas);
    setHistorico([...historico, perguntaAtual.id]);

    let proxima = null;
    if (opcao.proxima_pergunta && mapaPerguntas[opcao.proxima_pergunta]) proxima = mapaPerguntas[opcao.proxima_pergunta];
    else proxima = quiz.perguntas.find(p => p.ordem > perguntaAtual.ordem && !historico.includes(p.id) && p.id !== perguntaAtual.id) || null;

    if (proxima) {
      const sessao = getSessaoId();
      const v = escolherVariante(proxima, sessao);
      setVarianteAtual(v);
      registrarAbAtribuicao(quiz.id, sessao, proxima.id, v.variante);
      setPerguntaAtual(proxima);
      setInicioPergunta(Date.now());
    } else {
      setFinalizado(true);
      track(quiz.id, 'conclusao');
      dispararEvento('quiz_conclusao', { quiz: quiz.slug });
    }
  };

  const calcularScore = () => Object.values(respostas).reduce((acc, opcaoId) => {
    for (const p of quiz.perguntas) {
      const op = p.opcoes.find(o => o.id === opcaoId);
      if (op) return acc + (op.valor || 0);
    }
    return acc;
  }, 0);

  const enviarLead = async (e) => {
    e.preventDefault();
    const score = calcularScore();
    const lead = await salvarLead({
      quiz_id: quiz.id, nome: formLead.nome, email: formLead.email,
      telefone: formLead.telefone, respostas, score
    });
    setLeadSalvo(lead);
    dispararEvento('quiz_lead', { quiz: quiz.slug, score });
    try { window.fbq?.('track', 'Lead'); } catch {}
    try { window.gtag?.('event', 'generate_lead', { value: score }); } catch {}
  };

  const textoPergunta = varianteAtual?.texto || perguntaAtual.texto;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: tema.bg || '#fff', color: tema.texto || '#111' }}>
      <Pixels integracoes={quiz.integracoes} />
      <div className="max-w-xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: tema.primary || '#3B82F6' }}>{quiz.titulo}</h1>
          {quiz.subtitulo && <p className="text-sm opacity-70 mt-1">{quiz.subtitulo}</p>}
        </header>

        {!finalizado && (
          <div className="h-1.5 bg-gray-200 rounded-full mb-6 overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progresso}%`, background: tema.primary || '#3B82F6' }} />
          </div>
        )}

        {!finalizado && (
          <div>
            <h2 className="text-lg font-semibold mb-4">{textoPergunta}</h2>
            {perguntaAtual.imagem_url && <img src={perguntaAtual.imagem_url} className="rounded-lg mb-4" />}
            <div className="flex flex-col gap-3">
              {perguntaAtual.opcoes.map(op => (
                <button key={op.id} onClick={() => responder(op)}
                  className="text-left px-4 py-3 rounded-lg border-2 bg-white hover:opacity-90 transition"
                  style={{ borderColor: tema.primary || '#3B82F6', color: tema.primary || '#3B82F6' }}>
                  {op.texto}
                </button>
              ))}
            </div>
          </div>
        )}

        {finalizado && !leadSalvo && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-2" style={{ color: tema.primary || '#3B82F6' }}>Tudo pronto! 🎉</h2>
            <p className="text-sm text-gray-600 mb-4">Deixe seus dados para ver seu resultado personalizado.</p>
            <form onSubmit={enviarLead} className="space-y-3">
              <input required placeholder="Seu nome" value={formLead.nome}
                onChange={e => setFormLead({ ...formLead, nome: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input required type="email" placeholder="Seu e-mail" value={formLead.email}
                onChange={e => setFormLead({ ...formLead, email: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="WhatsApp (opcional)" value={formLead.telefone}
                onChange={e => setFormLead({ ...formLead, telefone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
              <button type="submit" className="w-full py-3 rounded-lg text-white font-medium"
                style={{ background: tema.primary || '#3B82F6' }}>Ver meu resultado</button>
            </form>
          </div>
        )}

        {finalizado && leadSalvo && (
          <ResultadoPagina quiz={quiz} score={leadSalvo.score} />
        )}
      </div>
    </div>
  );
}
