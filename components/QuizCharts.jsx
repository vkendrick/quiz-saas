'use client';
// Gráficos do quiz: import único e estático do recharts (módulo carregado
// de uma vez via dynamic na página — evita gráfico em branco).
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const CORES = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function limparMarcacoes(texto) {
  if (!texto) return '';
  return texto
    .replace(/==/g, '')
    .replace(/__/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function agruparPorPergunta(rows) {
  const mapa = {};
  (rows || []).forEach(r => {
    if (!mapa[r.pergunta_id]) mapa[r.pergunta_id] = { pergunta_texto: limparMarcacoes(r.pergunta_texto), opcoes: [] };
    mapa[r.pergunta_id].opcoes.push({ opcao_texto: r.opcao_texto, total: Number(r.total) });
  });
  return Object.values(mapa);
}

export default function QuizCharts({ m, lang = 'pt' }) {
  const T = lang === 'es'
    ? { des: 'Rendimiento por pregunta', disp: 'Dispositivos', camp: 'Mejores campañas', dist: 'Distribución de respuestas', sem: 'Sin datos aún' }
    : { des: 'Desempenho por pergunta', disp: 'Dispositivos', camp: 'Melhores campanhas', dist: 'Distribuição de respostas', sem: 'Sem dados ainda' };
  return (<>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
      <section className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3 text-sm text-center">{T.des}</h3>
        {m.funil.length === 0 ? <p className="text-xs text-gray-400 text-center">{T.sem}</p> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={m.funil}>
              <XAxis dataKey="ordem" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v, _n, p) => [v, limparMarcacoes(p.payload.texto)]} />
              <Bar dataKey="responderam" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3 text-sm text-center">{T.disp}</h3>
        {m.dispositivos.length === 0 ? <p className="text-xs text-gray-400 text-center">{T.sem}</p> : (
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={m.dispositivos} dataKey="total" nameKey="dispositivo" outerRadius={60}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {m.dispositivos.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>
      <section className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3 text-sm">{T.camp}</h3>
        {m.campanhas.length === 0 ? <p className="text-xs text-gray-400">{T.sem}</p> : (
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

    <section className="bg-white border rounded-lg p-4 mb-4">
      <h3 className="font-semibold mb-3 text-sm text-center">{T.dist}</h3>
      {m.respostas.length === 0 ? <p className="text-xs text-gray-400 text-center">{T.sem}</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {agruparPorPergunta(m.respostas).map((grupo, i) => (
            <div key={i} className="border rounded-lg p-3">
              <div className="text-xs font-semibold text-gray-700 mb-2 text-center">
                {limparMarcacoes(grupo.pergunta_texto)}
              </div>
              <ResponsiveContainer width="100%" height={Math.max(120, grupo.opcoes.length * 32)}>
                <BarChart data={grupo.opcoes} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="opcao_texto" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}
    </section>
  </>);
}
