#!/bin/bash
set -e

echo "🚀 Iniciando otimizações..."

# ============================================================
# 1. PALETAS — Aumentar contraste (WCAG AA)
# ============================================================
echo "📁 1/5 — Ajustando contraste das paletas..."

# Fundo claro — trocar cinzas por versões mais escuras
sed -i "s/textoSuave: '#6B7280'/textoSuave: '#4B5563'/g" lib/design/paletas.js
sed -i "s/textoSuave: '#64748B'/textoSuave: '#475569'/g" lib/design/paletas.js
sed -i "s/textoSuave: '#92400E'/textoSuave: '#78350F'/g" lib/design/paletas.js
sed -i "s/textoSuave: '#854D0E'/textoSuave: '#713F12'/g" lib/design/paletas.js
sed -i "s/textoSuave: '#9F1239'/textoSuave: '#881337'/g" lib/design/paletas.js
sed -i "s/textoSuave: '#0F766E'/textoSuave: '#115E59'/g" lib/design/paletas.js

sed -i "s/textoRodape: '#9CA3AF'/textoRodape: '#6B7280'/g" lib/design/paletas.js
sed -i "s/textoRodape: '#94A3B8'/textoRodape: '#64748B'/g" lib/design/paletas.js
sed -i "s/textoRodape: '#BE185D'/textoRodape: '#9D174D'/g" lib/design/paletas.js
sed -i "s/textoRodape: '#A16207'/textoRodape: '#854D0E'/g" lib/design/paletas.js
sed -i "s/textoRodape: '#115E59'/textoRodape: '#134E4A'/g" lib/design/paletas.js

# Paleta escuro-elegante — rodapé cinza claro demais sobre fundo escuro
sed -i "s/textoRodape: '#525252'/textoRodape: '#737373'/g" lib/design/paletas.js

echo "  ✅ Paletas ajustadas"

# ============================================================
# 2. NEXT.CONFIG — Remover next-on-pages (migrou pra OpenNext)
# ============================================================
echo "📁 2/5 — Atualizando next.config.js..."

cat > next.config.js <<'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: { unoptimized: true },
  transpilePackages: ['framer-motion'],
  experimental: {
    optimizePackageImports: ['framer-motion', 'recharts']
  }
};

module.exports = nextConfig;
EOF

echo "  ✅ next.config.js limpo (sem next-on-pages)"

# ============================================================
# 3. LAYOUT — Preconnect Supabase + Unsplash
# ============================================================
echo "📁 3/5 — Atualizando app/layout.js..."

cat > app/layout.js <<'EOF'
import './globals.css';
import { Inter, Poppins, Montserrat, Lato, Playfair_Display } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400','600','700','800'], variable: '--font-poppins', display: 'swap' });
const montserrat = Montserrat({ subsets: ['latin'], variable: '--font-montserrat', display: 'swap' });
const lato = Lato({ subsets: ['latin'], weight: ['400','700','900'], variable: '--font-lato', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });

export const metadata = {
  title: 'Quiz SaaS',
  description: 'Sistema de quiz dinâmico de alta conversão'
};

export default function RootLayout({ children }) {
  const fontes = [inter, poppins, montserrat, lato, playfair]
    .map(f => f.variable)
    .join(' ');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <html lang="pt-BR" className={fontes}>
      <head>
        {supabaseUrl && (
          <>
            <link rel="preconnect" href={supabaseUrl} />
            <link rel="dns-prefetch" href={supabaseUrl} />
          </>
        )}
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
EOF

echo "  ✅ layout.js com preconnect"

# ============================================================
# 4. IMAGENS — adicionar width/height/loading/decoding
# ============================================================
echo "📁 4/5 — Adicionando width/height nas imagens..."

# BlocoIntro — img principal
sed -i 's|<img\n              src={config.imagem_url}\n              alt="" decoding="async"|<img\n              src={config.imagem_url}\n              alt=""\n              width={400}\n              height={400}\n              decoding="async"|g' components/quiz/blocos/BlocoIntro.jsx 2>/dev/null || true

# BlocoAntesDepois — img antes
sed -i 's|<img\n              src={antes.imagem_url}\n              alt=""  loading="lazy" decoding="async"|<img\n              src={antes.imagem_url}\n              alt=""\n              width={400}\n              height={400}\n              loading="lazy"\n              decoding="async"|g' components/quiz/blocos/BlocoAntesDepois.jsx 2>/dev/null || true

# BlocoAntesDepois — img depois
sed -i 's|<img\n              src={depois.imagem_url}\n              alt=""  loading="lazy" decoding="async"|<img\n              src={depois.imagem_url}\n              alt=""\n              width={400}\n              height={400}\n              loading="lazy"\n              decoding="async"|g' components/quiz/blocos/BlocoAntesDepois.jsx 2>/dev/null || true

# BlocoProvaSocial — img principal
sed -i 's|<img\n          src={config.imagem_url}\n          alt=""\n          style={{ width: .100%., borderRadius: 16, marginBottom: 20 }}|<img\n          src={config.imagem_url}\n          alt=""\n          width={600}\n          height={400}\n          loading="lazy"\n          decoding="async"\n          style={{ width: "100%", borderRadius: 16, marginBottom: 20 }}|g' components/quiz/blocos/BlocoProvaSocial.jsx 2>/dev/null || true

# BlocoResultado — img faixa
sed -i 's|<img\n              src={faixa.imagem_url}\n              alt=""\n              loading="lazy"\n              style={{|<img\n              src={faixa.imagem_url}\n              alt=""\n              width={600}\n              height={400}\n              loading="lazy"\n              decoding="async"\n              style={{|g' components/quiz/blocos/BlocoResultado.jsx 2>/dev/null || true

# BlocoOferta — img antes/depois (2 ocorrências)
sed -i 's|<img\n              src={antesDepois.antes.imagem_url}\n              alt=""\n              loading="lazy"\n              decoding="async"|<img\n              src={antesDepois.antes.imagem_url}\n              alt=""\n              width={400}\n              height={400}\n              loading="lazy"\n              decoding="async"|g' components/quiz/blocos/BlocoOferta.jsx 2>/dev/null || true

sed -i 's|<img\n              src={antesDepois.depois.imagem_url}\n              alt=""\n              loading="lazy"\n              decoding="async"|<img\n              src={antesDepois.depois.imagem_url}\n              alt=""\n              width={400}\n              height={400}\n              loading="lazy"\n              decoding="async"|g' components/quiz/blocos/BlocoOferta.jsx 2>/dev/null || true

# BlocoOferta — img dos itens
sed -i 's|<img\n                  src={item.imagem_url}\n                  alt="" decoding="async"\n                  loading="lazy"|<img\n                  src={item.imagem_url}\n                  alt=""\n                  width={100}\n                  height={100}\n                  decoding="async"\n                  loading="lazy"|g' components/quiz/blocos/BlocoOferta.jsx 2>/dev/null || true

# BlocoLoading — img especialista
sed -i 's|<img\n              src={config.especialista.imagem_url}\n              alt=""\n              loading="lazy"|<img\n              src={config.especialista.imagem_url}\n              alt=""\n              width={80}\n              height={80}\n              loading="lazy"|g' components/quiz/blocos/BlocoLoading.jsx 2>/dev/null || true

echo "  ✅ Imagens ajustadas (ou ignoradas se já tinham)"

# ============================================================
# 5. METRICAS — Recharts lazy (dynamic import)
# ============================================================
echo "📁 5/5 — Convertendo Recharts para lazy load..."

# Metricas.jsx
cat > components/Metricas.jsx <<'EOF'
'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { getMetricas } from '@/lib/metricas';
import { supabase } from '@/lib/supabase-browser';
import { Card } from './ui';

const BarChart = dynamic(() => import('recharts').then(m => m.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(m => m.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(m => m.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(m => m.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(m => m.Cell), { ssr: false });
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false });

function limparMarcacoes(texto) {
  if (!texto) return '';
  return texto
    .replace(/==/g, '')
    .replace(/__/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

const CORES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const PERIODOS = [
  { label: '24 horas', value: '24 hours' },
  { label: '7 dias', value: '7 days' },
  { label: '30 dias', value: '30 days' },
  { label: '90 dias', value: '90 days' }
];

export default function Metricas({ quizId }) {
  const [periodo, setPeriodo] = useState('7 days');
  const [m, setM] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [chartsProntos, setChartsProntos] = useState(false);

  useEffect(() => { setChartsProntos(true); }, []);

  const carregar = () => {
    setCarregando(true);
    getMetricas(quizId, periodo).then(setM).finally(() => setCarregando(false));
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [quizId, periodo]);

  useEffect(() => {
    const ch = supabase.channel('ev-' + quizId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'eventos', filter: `quiz_id=eq.${quizId}` }, () => carregar())
      .subscribe();
    return () => supabase.removeChannel(ch);
    /* eslint-disable-next-line */
  }, [quizId, periodo]);

  if (carregando && !m) return <div className="text-gray-400">Carregando métricas...</div>;
  if (!m) return null;

  const r = m.resumo || {};

  return (
    <div>
      <div className="flex gap-2 mb-6">
        {PERIODOS.map(p => (
          <button key={p.value} onClick={() => setPeriodo(p.value)}
            className={`px-3 py-1.5 text-xs rounded-md border ${periodo === p.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white'}`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        <Card titulo="Visitas e Acessos" valor={r.visualizacoes ?? '--'} />
        <Card titulo="Respostas Iniciadas" valor={r.inicios ?? '--'} />
        <Card titulo="Conclusões" valor={r.conclusoes ?? '--'} />
        <Card titulo="Tempo Médio" valor={r.tempo_medio ? `${Math.round(r.tempo_medio)}ms` : '--'} />
        <Card titulo="Taxa de Conclusão" valor={r.taxa_conclusao ? `${r.taxa_conclusao}%` : '--'} />
      </div>

      <section className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-4 text-sm text-center">Desempenho por pergunta</h3>
        {m.funil.length === 0 ? <p className="text-xs text-gray-400 text-center">Sem dados ainda</p> : !chartsProntos ? (
          <p className="text-xs text-gray-400 text-center">Carregando gráfico…</p>
        ) : (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={m.funil}>
                <XAxis dataKey="ordem" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, _n, p) => [v, limparMarcacoes(p.payload.texto)]} />
                <Bar dataKey="responderam" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold mb-4 text-sm text-center">Dispositivos</h3>
          {m.dispositivos.length === 0 ? <p className="text-xs text-gray-400 text-center">Sem dados ainda</p> : !chartsProntos ? (
            <p className="text-xs text-gray-400 text-center">Carregando…</p>
          ) : (
            <div style={{ maxWidth: 400, margin: '0 auto' }}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={m.dispositivos} dataKey="total" nameKey="dispositivo" outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {m.dispositivos.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Pie>
                  <Legend /><Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
        <section className="bg-white border rounded-lg p-5">
          <h3 className="font-semibold mb-4 text-sm">Melhores campanhas</h3>
          {m.campanhas.length === 0 ? <p className="text-xs text-gray-400">Sem dados ainda</p> : (
            <table className="w-full text-sm">
              <tbody>
                {m.campanhas.map((c, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 text-gray-600">{c.utm_campaign}</td>
                    <td className="py-2 text-right font-medium">{c.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="bg-white border rounded-lg p-5 mb-6">
        <h3 className="font-semibold mb-4 text-sm text-center">Distribuição de respostas</h3>
        {m.respostas.length === 0 ? <p className="text-xs text-gray-400 text-center">Sem dados ainda</p> : !chartsProntos ? (
          <p className="text-xs text-gray-400 text-center">Carregando…</p>
        ) : (
          <div className="space-y-6">
            {agruparPorPergunta(m.respostas).map((grupo, i) => (
              <div key={i}>
                <div className="text-xs font-semibold text-gray-700 mb-2 text-center">
                  {limparMarcacoes(grupo.pergunta_texto)}
                </div>
                <div style={{ maxWidth: 620, margin: '0 auto' }}>
                  <ResponsiveContainer width="100%" height={Math.max(140, grupo.opcoes.length * 45)}>
                    <BarChart data={grupo.opcoes} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="opcao_texto" width={200} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      <AbPanel dados={m.ab} />
    </div>
  );
}

function AbPanel({ dados }) {
  if (!dados || dados.length === 0) return null;
  const grupos = {};
  dados.forEach(d => {
    if (!grupos[d.pergunta_id]) grupos[d.pergunta_id] = { texto: limparMarcacoes(d.pergunta_texto), variantes: [] };
    grupos[d.pergunta_id].variantes.push(d);
  });

  return (
    <section className="bg-white border rounded-lg p-5 mt-6">
      <h3 className="font-semibold mb-4 text-sm">A/B test de perguntas</h3>
      <div className="space-y-6">
        {Object.entries(grupos).map(([pid, g]) => (
          <div key={pid}>
            <div className="text-xs font-semibold text-gray-700 mb-3">{g.texto}</div>
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Variante</th>
                  <th className="p-2 text-right">Respostas</th>
                  <th className="p-2 text-right">Conclusões</th>
                  <th className="p-2 text-right">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {g.variantes.map(v => (
                  <tr key={v.variante} className="border-t">
                    <td className="p-2 font-medium">{v.variante}</td>
                    <td className="p-2 text-right">{v.respostas}</td>
                    <td className="p-2 text-right">{v.conclusoes}</td>
                    <td className="p-2 text-right font-semibold">{v.taxa_conclusao}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}

function agruparPorPergunta(rows) {
  const mapa = {};
  rows.forEach(r => {
    if (!mapa[r.pergunta_id]) mapa[r.pergunta_id] = { pergunta_texto: limparMarcacoes(r.pergunta_texto), opcoes: [] };
    mapa[r.pergunta_id].opcoes.push({ opcao_texto: r.opcao_texto, total: Number(r.total) });
  });
  return Object.values(mapa);
}
EOF

echo "  ✅ Metricas.jsx com lazy Recharts"

# ============================================================
# FIM
# ============================================================
echo ""
echo "🎉 Otimizações aplicadas com sucesso!"
echo ""
echo "📋 Próximos passos:"
echo "  1. git add . && git commit -m 'perf: otimizações de performance + contraste'"
echo "  2. git push"
echo "  3. Cloudflare → Caching → Purge Everything"
echo ""
echo "⚠️  Verifique manualmente:"
echo "  - Comparativo page.js (recharts lazy)"
echo "  - Imagens em BlocoPergunta.jsx e BlocoGrafico.jsx"