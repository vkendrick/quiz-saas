// STAGE → quiz-saas/components/Depoimentos.jsx (ARQUIVO NOVO, client)
// Prova social dinâmica (nada mockado): lê /api/prisma/depoimentos.
'use client';
import { useEffect, useState } from 'react';

export default function Depoimentos({ tenant = 'PRISMA', contexto = 'vendas', escuro = true }) {
  const [lista, setLista] = useState([]);
  useEffect(() => {
    fetch(`/api/prisma/depoimentos?tenant=${tenant}&contexto=${contexto}`)
      .then(r => r.json()).then(j => { if (j.ok) setLista(j.depoimentos); }).catch(() => {});
  }, [tenant, contexto]);
  if (!lista.length) return null;
  const card = escuro
    ? { background: '#151A24', border: '1px solid #232B3B', color: '#E8ECF3' }
    : { background: '#fff', border: '1px solid #D0E8DF', color: '#1A1A1A' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginTop: 20 }}>
      {lista.map(x => (
        <div key={x.nome + x.texto.slice(0, 20)} style={{ ...card, borderRadius: 14, padding: 20 }}>
          <div style={{ color: '#F5A623', marginBottom: 8 }}>★★★★★</div>
          {x.foto_url && (
            <img src={x.foto_url} alt={x.nome} loading="lazy"
              style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', marginBottom: 10 }} />
          )}
          <p style={{ fontStyle: 'italic', fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{x.texto}</p>
          <p style={{ fontSize: 13, fontWeight: 700 }}>{x.nome}</p>
          {x.local && <p style={{ fontSize: 12, opacity: .65 }}>{x.local}</p>}
        </div>
      ))}
    </div>
  );
}
