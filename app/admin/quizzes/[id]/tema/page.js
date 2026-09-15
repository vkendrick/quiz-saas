'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { atualizarQuiz } from '@/lib/quiz2';
import SeletorPaleta from '@/components/editor/SeletorPaleta';
import SeletorFonte from '@/components/editor/SeletorFonte';
import SeletorImagem from '@/components/editor/SeletorImagem';
export const runtime = 'edge';
export default function TemaPage() {
  const { id } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    supabase.from('quizzes').select('*').eq('id', id).single()
      .then(({ data }) => setQuiz(data));
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [id]);

  if (!quiz) return <div style={{ padding: 40 }}>Carregando…</div>;

  const set = (patch) => setQuiz({ ...quiz, ...patch });

  const salvar = async () => {
    setSalvando(true);
    await atualizarQuiz(quiz.id, {
      preset_tema: quiz.preset_tema,
      paleta_id: quiz.paleta_id,
      fonte_id: quiz.fonte_id,
      cor_cta: quiz.cor_cta,
      cliente_nome: quiz.cliente_nome,
      cliente_logo_url: quiz.cliente_logo_url,
      logo_topo_url: quiz.logo_topo_url,
      logo_topo_altura: quiz.logo_topo_altura,
      rodape_texto: quiz.rodape_texto
    });
    setSalvando(false);
    alert('Salvo!');
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/admin/quizzes/${id}`} style={{ color: '#6B7280', fontSize: 13 }}>← Voltar</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🎭 Aparência</h1>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        <Bloco titulo="Preset de layout">
          <select value={quiz.preset_tema || 'inlead-clean'} onChange={e => set({ preset_tema: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}>
            <option value="inlead-clean">Inlead Clean</option>
            <option value="inlead-vibrant">Inlead Vibrant</option>
            <option value="minimal-dark">Minimal Dark</option>
          </select>
        </Bloco>

        <Bloco titulo="Paleta de cores">
          <SeletorPaleta valor={quiz.paleta_id || 'clean-preto'} onChange={v => set({ paleta_id: v })} />
        </Bloco>

        <Bloco titulo="Cor do CTA (opcional — sobrepõe a paleta)">
          <input type="color" value={quiz.cor_cta || '#0EA5E9'}
            onChange={e => set({ cor_cta: e.target.value })}
            style={{ width: 80, height: 40, border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer' }} />
        </Bloco>

        <Bloco titulo="Fonte">
          <SeletorFonte valor={quiz.fonte_id || 'inter'} onChange={v => set({ fonte_id: v })} />
        </Bloco>

        <Bloco titulo="Cliente">
          <div style={{ display: 'grid', gap: 10 }}>
            <label style={{ fontSize: 12 }}>
              Nome do cliente
              <input value={quiz.cliente_nome || ''} onChange={e => set({ cliente_nome: e.target.value })}
                placeholder="Ex: Protocolo Adeus Rinite"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Logo no topo do quiz
              <div style={{ marginTop: 4 }}>
                <SeletorImagem valor={quiz.logo_topo_url} onChange={v => set({ logo_topo_url: v })} pasta="logos" />
              </div>
            </label>
            {quiz.logo_topo_url && (
              <label style={{ fontSize: 12 }}>
                Altura da logo (px)
                <input type="number" value={quiz.logo_topo_altura || 50}
                  onChange={e => set({ logo_topo_altura: parseInt(e.target.value) || 50 })}
                  style={{ width: 100, padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, marginLeft: 8 }} />
              </label>
            )}
            <label style={{ fontSize: 12 }}>
              Texto do rodapé
              <input value={quiz.rodape_texto || ''} onChange={e => set({ rodape_texto: e.target.value })}
                placeholder="© 2026 · Nome do Cliente"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, marginTop: 4 }} />
            </label>
          </div>
        </Bloco>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={salvar} disabled={salvando}
            style={{
              padding: '10px 20px', background: '#3B82F6', color: '#FFF',
              border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: salvando ? 'wait' : 'pointer'
            }}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          <a href={`/quiz/${quiz.slug}`} target="_blank"
            style={{ padding: '10px 20px', background: '#F3F4F6', color: '#111827', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>
            Ver em nova aba ↗
          </a>
        </div>
      </div>
    </div>
  );
}

function Bloco({ titulo, children }) {
  return (
    <div style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12 }}>{titulo}</div>
      {children}
    </div>
  );
}