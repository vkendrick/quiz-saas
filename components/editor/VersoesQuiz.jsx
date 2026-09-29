'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

// Versões do quiz: salvar snapshot, restaurar (voltar versão).
export default function VersoesQuiz({ quizId, onRestaurou }) {
  const [vs, setVs] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const token = async () => (await supabase.auth.getSession()).data?.session?.access_token || '';

  const carregar = async () => {
    const r = await fetch(`/api/quiz/versions?quiz_id=${quizId}`, {
      headers: { Authorization: 'Bearer ' + await token() },
    }).then(r => r.json()).catch(() => ({}));
    if (r.ok) setVs(r.versions || []);
  };
  useEffect(() => { if (aberto) carregar(); /* eslint-disable-next-line */ }, [aberto, quizId]);

  const salvar = async () => {
    const nome = prompt('Nome desta versão (ex: antes de trocar a pergunta 3):', '');
    if (nome === null) return;
    setOcupado(true);
    const r = await fetch('/api/quiz/versions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() },
      body: JSON.stringify({ quiz_id: quizId, nome: nome || null }),
    }).then(r => r.json()).catch(() => ({}));
    setOcupado(false);
    alert(r.ok ? `✅ Versão ${r.numero} salva!` : 'Erro: ' + (r.error || 'falha'));
    carregar();
  };

  const restaurar = async (v) => {
    if (!confirm(`Voltar para a versão ${v.numero}${v.nome ? ` (${v.nome})` : ''}?\n\nO conteúdo atual será substituído.`)) return;
    setOcupado(true);
    const r = await fetch('/api/quiz/versions/restore', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await token() },
      body: JSON.stringify({ version_id: v.id }),
    }).then(r => r.json()).catch(() => ({}));
    setOcupado(false);
    if (r.ok) { alert(`✅ Voltou para a versão ${r.numero}!`); onRestaurou?.(); carregar(); }
    else alert('Erro: ' + (r.error || 'falha'));
  };

  return (
    <div style={{ marginBottom: 16, border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
      <button type="button" onClick={() => setAberto(a => !a)}
        style={{ width: '100%', padding: '10px 14px', background: '#F9FAFB', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#374151', textAlign: 'left' }}>
        {aberto ? '▾' : '▸'} 🕘 Versões ({vs.length || '…'})
      </button>
      {aberto && (
        <div style={{ padding: 12, display: 'grid', gap: 8 }}>
          <button type="button" onClick={salvar} disabled={ocupado}
            style={{ padding: '8px 14px', background: '#7C3AED', color: '#FFF', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {ocupado ? '…' : '💾 Salvar versão atual'}
          </button>
          {vs.map(v => (
            <div key={v.id} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#374151' }}>
              <b>v{v.numero}</b>
              <span style={{ flex: 1 }}>{v.nome || <span style={{ color: '#9CA3AF' }}>sem nome</span>} · {new Date(v.criado_em).toLocaleString('pt-BR')}</span>
              <button type="button" onClick={() => restaurar(v)} disabled={ocupado}
                style={{ padding: '5px 10px', background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                ↩ Restaurar
              </button>
            </div>
          ))}
          {!vs.length && <p style={{ fontSize: 12, color: '#9CA3AF' }}>Nenhuma versão salva. Salve antes de grandes mudanças.</p>}
        </div>
      )}
    </div>
  );
}
