'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import EditorBlocos from '@/components/editor/EditorBlocos';
import PreviewTempoReal from '@/components/editor/PreviewTempoReal';
import GuiaTexto from '@/components/editor/GuiaTexto';
export const runtime = 'edge';
export default function EditorQuizPage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [blocos, setBlocos] = useState([]);
  const [versaoPreview, setVersaoPreview] = useState(0);
  const [previewAberto, setPreviewAberto] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState(null);

  const carregar = async () => {
    const { data: q } = await supabase.from('quizzes').select('*').eq('id', id).single();
    const { data: b } = await supabase.from('blocos').select('*')
      .eq('quiz_id', id).order('ordem');
    setQuiz(q);
    setBlocos(b || []);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [id]);

  if (!quiz) return <div style={{ padding: 40 }}>Carregando…</div>;

  // 🔽 SALVAR com revisão
  const salvarERevisar = async () => {
    setSalvando(true);
    setToast(null);

    try {
      // 1. Renumera todos os blocos em sequência (limpa bagunça)
      const ordenados = [...blocos].sort((a, b) => a.ordem - b.ordem);
      const novasOrdens = ordenados.map((b, i) => ({ id: b.id, ordem: i + 1 }));

      // Salva cada um (paralelo)
      await Promise.all(
        novasOrdens.map(({ id: blocoId, ordem }) =>
          supabase.from('blocos').update({ ordem }).eq('id', blocoId)
        )
      );

      // 2. Marca o quiz como revisado
      const { data: user } = await supabase.auth.getUser();
      await supabase
        .from('quizzes')
        .update({
          revisado_em: new Date().toISOString(),
          revisado_por: user?.user?.id || null,
          publicado: true
        })
        .eq('id', quiz.id);

      // 3. Recarrega pra refletir
      await carregar();
      setVersaoPreview(v => v + 1);

      setToast({
        tipo: 'sucesso',
        texto: `✅ Quiz revisado e salvo! ${blocos.length} blocos em ordem.`
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      console.error(err);
      setToast({ tipo: 'erro', texto: '❌ Erro ao salvar: ' + err.message });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link href={`/admin/quizzes/${id}`} style={{ color: '#6B7280', fontSize: 13 }}>
          ← Voltar
        </Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>
          Editor · {quiz.titulo}
         </h1>

        {quiz.revisado_em && (
          <span style={{
            fontSize: 11,
            background: '#D1FAE5',
            color: '#065F46',
            padding: '3px 8px',
            borderRadius: 999,
            fontWeight: 600
          }}>
            ✓ Revisado em {new Date(quiz.revisado_em).toLocaleDateString('pt-BR')}
          </span>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setPreviewAberto(!previewAberto)}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              background: previewAberto ? '#EFF6FF' : '#111827',
              color: previewAberto ? '#2563EB' : '#FFF',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            {previewAberto ? '👁️ Ocultar preview' : '👁️ Ver preview'}
          </button>

          <button
            type="button"
            onClick={salvarERevisar}
            disabled={salvando}
            style={{
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              background: salvando ? '#93C5FD' : '#10B981',
              color: '#FFF',
              border: 'none',
              borderRadius: 8,
              cursor: salvando ? 'wait' : 'pointer'
            }}
          >
            {salvando ? '⏳ Salvando…' : '💾 Salvar e revisar'}
          </button>

          <a href={`/quiz/${quiz.slug}`} target="_blank"
            style={{
              padding: '8px 14px', fontSize: 12,
              color: '#3B82F6', textDecoration: 'none',
              display: 'flex', alignItems: 'center'
            }}>
            Nova aba ↗
          </a>
        </div>
          <GuiaTexto />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          padding: '12px 16px',
          background: toast.tipo === 'sucesso' ? '#D1FAE5' : '#FEE2E2',
          color: toast.tipo === 'sucesso' ? '#065F46' : '#991B1B',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 500
        }}>
          {toast.texto}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: previewAberto ? 'minmax(0, 1fr) minmax(360px, 480px)' : '1fr',
        gap: 20,
        alignItems: 'start'
      }}>
        <div style={{ minWidth: 0 }}>
          <EditorBlocos
            quiz={quiz}
            blocos={blocos}
            onRecarregar={carregar}
            onMudouPreview={() => setVersaoPreview(v => v + 1)}
          />
        </div>

        {previewAberto && (
          <div style={{
            position: 'sticky',
            top: 20,
            height: 'calc(100vh - 80px)'
          }}>
            <PreviewTempoReal slug={quiz.slug} versao={versaoPreview} />
          </div>
        )}
      </div>
    </div>
  );
}