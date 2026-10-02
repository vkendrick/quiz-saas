'use client';

// Funil fluxo em SVG (curvas suaves): recebe o resumo já calculado.
// CÁLCULO ÚNICO na lib/metricas — sem query própria, sem drift.
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
  pt: { acima: 'acima', abaixo: 'abaixo' },
  es: { acima: 'arriba', abaixo: 'abajo' },
};

function veredito(pct, ref, lang) {
  const v = VER[lang] || VER.pt;
  if (pct == null) return null;
  if (pct >= ref) return { txt: v.acima, cor: '#10B981' };
  return { txt: v.abaixo, cor: '#EF4444' };
}

const W = 600;
const H = 190;
const TOPO = 52;
const CENTRO = 128;
const ALT = 62;

export default function FunilIdeal({ resumo, lang = 'pt' }) {
  const chegou = Number(resumo?.visualizacoes ?? resumo?.inicios ?? 0) || 0;
  const concluiu = Number(resumo?.conclusoes ?? 0) || 0;
  const clicou = Number(resumo?.cliques ?? 0) || 0;
  const comprou = Number(resumo?.comprou ?? 0) || 0;
  if (!chegou) return null;

  const vals = [chegou, concluiu, clicou, comprou];
  const max = Math.max(1, ...vals);
  const pctPrev = vals.map((v, i) =>
    i === 0 ? 100 : vals[i - 1] > 0 ? Math.round((100 * v) / vals[i - 1]) : 0,
  );
  const etapas = IDEAL[lang] || IDEAL.pt;
  const n = vals.length;
  const seg = W / n;
  // Meia-altura por etapa (mínimo p/ etapa zerada continuar visível).
  const meia = vals.map((v) =>
    v <= 0 ? 4 : Math.max(10, Math.round((ALT * v) / max)),
  );
  const cx = (i) => Math.round(i * seg + seg / 2);
  // Curva suave topo: de (x0,t0) a (x1,t1) com tangentes horizontais.
  const curva = (x0, t0, x1, t1) =>
    `C ${Math.round(x0 + seg / 2)} ${t0}, ${Math.round(x1 - seg / 2)} ${t1}, ${x1} ${t1}`;
  let topo = `M 0 ${CENTRO - meia[0]}`;
  for (let i = 0; i < n - 1; i++) {
    const xa = Math.round((i + 1) * seg);
    topo += ` L ${xa} ${CENTRO - meia[i]}`;
    topo += ` ${curva(xa, CENTRO - meia[i], xa + seg, CENTRO - meia[i + 1])}`;
  }
  topo += ` L ${W} ${CENTRO - meia[n - 1]}`;
  let base = ` L ${W} ${CENTRO + meia[n - 1]}`;
  for (let i = n - 1; i > 0; i--) {
    const xa = Math.round((i + 1) * seg);
    const xb = Math.round(i * seg);
    base += ` L ${xa} ${CENTRO + meia[i]}`;
    base += ` ${curva(xa, CENTRO + meia[i], xb, CENTRO + meia[i - 1])}`;
  }
  base += ` L 0 ${CENTRO + meia[0]} Z`;
  const d = topo + base;

  return (
    <section style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 2 }}>{lang === 'es' ? 'Embudo × ideal' : 'Funil × ideal'}</h3>
      <p style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginBottom: 8 }}>{lang === 'es' ? '% de la etapa anterior · referencia de mercado' : '% da etapa anterior · referência de mercado'}</p>
      <svg viewBox={`0 0 ${W} ${H + 34}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          <linearGradient id="fluxo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#BFDBFE" />
            <stop offset="55%" stopColor="#60A5FA" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        {etapas.map((s, i) => (
          <line
            key={`g${i}`}
            x1={Math.round(i * seg)}
            y1={TOPO - 6}
            x2={Math.round(i * seg)}
            y2={H}
            stroke="#E5E7EB"
            strokeWidth="1"
          />
        ))}
        <path d={d} fill="url(#fluxo)" opacity="0.9" />
        {etapas.map((s, i) => (
          <text
            key={`t${i}`}
            x={cx(i)}
            y={CENTRO - meia[i] - 22}
            textAnchor="middle"
            fontSize="11"
            fill="#6B7280"
          >
            {s.etapa.toUpperCase()}
          </text>
        ))}
        {vals.map((v, i) => (
          <text
            key={`v${i}`}
            x={cx(i)}
            y={CENTRO - meia[i] - 8}
            textAnchor="middle"
            fontSize="15"
            fontWeight="800"
            fill="#111827"
          >
            {v}
          </text>
        ))}
        {pctPrev.map(
          (p, i) =>
            i > 0 && (
              <text
                key={`p${i}`}
                x={Math.round(i * seg)}
                y={CENTRO + ALT + 12}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={p >= etapas[i].ref ? '#10B981' : '#6B7280'}
              >
                {p}%
              </text>
            ),
        )}
        {etapas.map((s, i) => {
          if (i === 0) return null;
          const vd = veredito(pctPrev[i], s.ref, lang);
          return (
            <text
              key={`r${i}`}
              x={cx(i)}
              y={H + 26}
              textAnchor="middle"
              fontSize="10"
              fill="#9CA3AF"
            >
              {`ideal ${s.ref}% · `}
              <tspan fill={vd.cor} fontWeight="700">
                {vd.txt}
              </tspan>
            </text>
          );
        })}
      </svg>
    </section>
  );
}
