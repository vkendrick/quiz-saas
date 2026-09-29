'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { contarEventosVersao } from '@/lib/metricas';

// Compara duas versões do quiz: entrou, concluiu, checkout + %.
export default function ComparativoVersoes({ quizId, lang = 'pt' }) {
  const T = lang === 'es'
    ? { t: '🔀 Versión A × B', s: 'Compara el acumulado de cada versión. B respecto a A.', k: ['Comenzó', 'Completó', 'Clic'], tx: 'Tasa de compleción', load: 'Cargando…' }
    : { t: '🔀 Versão A × B', s: 'Compara o acumulado de cada versão. B em relação a A.', k: ['Começou', 'Concluiu', 'Clicou'], tx: 'Taxa de conclusão', load: 'Carregando…' };
  const [vs, setVs] = useState([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [d, setD] = useState(null);

  useEffect(() => {
    supabase.from('quiz_versions').select('numero,nome,criado_em').eq('quiz_id', quizId)
      .order('numero')
      .then(({ data }) => {
        const lista = data || [];
        setVs(lista);
        if (lista.length >= 2) {
          setA(String(lista[lista.length - 2].numero));
          setB(String(lista[lista.length - 1].numero));
        }
      });
  }, [quizId]);

  useEffect(() => {
    if (!a || !b) { setD(null); return; }
    let cancelado = false;
    (async () => {
      const tipos = ['inicio', 'conclusao', 'cta_clique'];
      const [va, vb] = await Promise.all([
        Promise.all(tipos.map(t => contarEventosVersao(quizId, t, +a))),
        Promise.all(tipos.map(t => contarEventosVersao(quizId, t, +b))),
      ]);
      if (!cancelado) setD({ va, vb });
    })();
    return () => { cancelado = true; };
  }, [quizId, a, b]);

  if (vs.length < 1) return null;
  const nome = (n) => { const v = vs.find(x => String(x.numero) === String(n)); return v ? `v${v.numero}${v.nome ? ' · ' + v.nome : ''}` : `v${n}`; };
  const KPIS = [
    { nome: T.k[0], emoji: '🚀', i: 0 },
    { nome: T.k[1], emoji: '✅', i: 1 },
    { nome: T.k[2], emoji: '🛒', i: 2 },
  ];

  return (
    <section style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 14, marginTop: 16 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{T.t}</h3>
      <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
        {T.s}
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: '#6B7280' }}>A&nbsp;
          <select value={a} onChange={e => setA(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
            <option value="">—</option>
            {vs.map(v => <option key={v.numero} value={v.numero}>v{v.numero}{v.nome ? ' · ' + v.nome : ''}</option>)}
          </select>
        </label>
        <label style={{ fontSize: 12, color: '#6B7280' }}>B&nbsp;
          <select value={b} onChange={e => setB(e.target.value)} style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: '6px 10px', fontSize: 12 }}>
            <option value="">—</option>
            {vs.map(v => <option key={v.numero} value={v.numero}>v{v.numero}{v.nome ? ' · ' + v.nome : ''}</option>)}
          </select>
        </label>
      </div>
      {!d && a && b && <p style={{ fontSize: 12, color: '#9CA3AF' }}>{T.load}</p>}
      {d && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {KPIS.map(k => (
              <div key={k.nome} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 11, color: '#6B7280', fontWeight: 600, marginBottom: 4 }}>{k.emoji} {k.nome}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>{d.vb[k.i]}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{nome(a)}: {d.va[k.i]}</div>
                <div style={{ marginTop: 6 }}><Delta hoje={d.vb[k.i]} ontem={d.va[k.i]} /></div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 10 }}>
            {T.tx}: <b style={{ color: '#111827' }}>{taxa(d.vb[1], d.vb[0])}%</b> ({nome(b)}) vs {taxa(d.va[1], d.va[0])}% ({nome(a)})
          </p>
        </>
      )}
    </section>
  );
}

function taxa(c, e) { return e > 0 ? Math.round(1000 * c / e) / 10 : 0; }

function Delta({ hoje, ontem, sufixo = '%' }) {
  let txt = '—', cor = '#9CA3AF', bg = '#F3F4F6';
  if (ontem > 0) {
    const p = Math.round(1000 * (hoje - ontem) / ontem) / 10;
    if (p > 0) { txt = `▲ +${p}${sufixo}`; cor = '#10B981'; bg = '#ECFDF5'; }
    else if (p < 0) { txt = `▼ ${p}${sufixo}`; cor = '#EF4444'; bg = '#FEF2F2'; }
    else { txt = `= 0${sufixo}`; }
  } else if (hoje > 0) { txt = '▲ novo'; cor = '#10B981'; bg = '#ECFDF5'; }
  return (
    <span style={{ fontSize: 12, fontWeight: 700, color: cor, background: bg, borderRadius: 999, padding: '3px 10px' }}>
      {txt}
    </span>
  );
}
