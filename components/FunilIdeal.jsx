'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { janelaDoPeriodo } from '@/lib/metricas';

// Referência de mercado p/ quiz (conversão etapa/etapa anterior).
const IDEAL = {
  pt: [
    { etapa: 'Chegou', ref: 100 },
    { etapa: 'Concluiu', ref: 40 },
    { etapa: 'Clicou', ref: 15 },
    { etapa: 'Comprou', ref: 4 },
  ],
  es: [
    { etapa: 'Llegó', ref: 100 },
    { etapa: 'Completó', ref: 40 },
    { etapa: 'Clic', ref: 15 },
    { etapa: 'Compró', ref: 4 },
  ],
};
const VER = {
  pt: { acima: 'acima', media: 'na média', abaixo: 'abaixo' },
  es: { acima: 'arriba', media: 'en la media', abaixo: 'abajo' },
};

function veredito(pct, ref, lang) {
  const v = VER[lang] || VER.pt;
  if (pct == null) return null;
  if (pct >= ref) return { txt: v.acima, cor: '#10B981' };
  if (pct >= ref * 0.7) return { txt: v.media, cor: '#F59E0B' };
  return { txt: v.abaixo, cor: '#EF4444' };
}

export default function FunilIdeal({ quizId, periodo, resumo, lang = 'pt' }) {
  const [extra, setExtra] = useState(null);
  // Se o resumo já traz cliques/comprou (janela exata), usa direto — sem drift.
  const direto = resumo && resumo.cliques != null && resumo.comprou != null;

  useEffect(() => {
    if (direto) { setExtra({ cliques: Number(resumo.cliques) || 0, comprou: Number(resumo.comprou) || 0 }); return; }
    let cancelado = false;
    (async () => {
      try {
        const { de: desde, ate } = janelaDoPeriodo(periodo);
        const noAte = (q, col) => (ate ? q.lt(col, ate) : q);
        const [{ count: cliques }, { data: comp }] = await Promise.all([
          noAte(supabase.from('eventos').select('id', { count: 'exact', head: true })
            .eq('quiz_id', quizId).eq('tipo', 'cta_clique').gte('criado_em', desde), 'criado_em'),
          noAte(supabase.from('leads').select('id')
            .eq('quiz_id', quizId).eq('status_pipeline', 'comprou').gte('comprou_em', desde), 'comprou_em'),
        ]);
        if (!cancelado) setExtra({ cliques: cliques || 0, comprou: (comp || []).length });
      } catch { if (!cancelado) setExtra({ cliques: 0, comprou: 0 }); }
    })();
    return () => { cancelado = true; };
  }, [quizId, periodo, direto]);

  const chegou = Number(resumo?.visualizacoes ?? resumo?.inicios ?? 0) || 0;
  const concluiu = Number(resumo?.conclusoes ?? 0) || 0;
  const clicou = Number(extra?.cliques ?? 0) || 0;
  const comprou = Number(extra?.comprou ?? 0) || 0;
  if (!chegou && extra === null) return null;

  const vals = [chegou, concluiu, clicou, comprou];
  const max = Math.max(1, ...vals);
  const pctPrev = vals.map((v, i) => (i === 0 ? 100 : vals[i - 1] > 0 ? Math.round((100 * v) / vals[i - 1]) : 0));

  return (
    <section style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 2 }}>{lang === 'es' ? 'Embudo × ideal' : 'Funil × ideal'}</h3>
      <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 12 }}>{lang === 'es' ? '% de la etapa anterior · referencia de mercado' : '% da etapa anterior · referência de mercado'}</p>
      <div style={{ maxWidth: 560, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(IDEAL[lang] || IDEAL.pt).map((s, i) => {
          const v = vals[i];
          const pct = pctPrev[i];
          const vd = i === 0 ? null : veredito(pct, s.ref, lang);
          return (
            <div key={s.etapa}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12, marginBottom: 3 }}>
                <b style={{ width: 74 }}>{s.etapa}</b>
                <span style={{ fontWeight: 700 }}>{v}</span>
                {i > 0 && <span style={{ color: '#6B7280' }}>{pct}%</span>}
                <span style={{ marginLeft: 'auto', color: '#9CA3AF', fontSize: 11 }}>ideal {i === 0 ? '—' : `${s.ref}%`}</span>
                {vd && <span style={{ fontSize: 11, fontWeight: 700, color: vd.cor }}>{vd.txt}</span>}
              </div>
              <div style={{ height: 26, display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: `${Math.max(8, Math.round((100 * Math.max(v, 1)) / max))}%`,
                  minWidth: 60, background: vd && vd.cor === '#EF4444' ? '#FCA5A5' : '#3B82F6',
                  borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 11, fontWeight: 700,
                }}>
                  {i > 0 ? `${pct}%` : `${v}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function parsePeriodo(p) {
  const m = String(p || '').match(/^(\d+)\s*(hour|day)/);
  if (!m) return 7 * 86400e3;
  const n = parseInt(m[1], 10);
  return m[2].startsWith('hour') ? n * 3600e3 : n * 86400e3;
}
