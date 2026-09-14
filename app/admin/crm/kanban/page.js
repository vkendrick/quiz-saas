'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { listarQuizzes } from '@/lib/quiz2';

const COLUNAS = [
  { id: 'novo',           label: 'Novo',         emoji: '🆕' },
  { id: 'iniciou',        label: 'Iniciou',      emoji: '🚀' },
  { id: 'respondeu',      label: 'Respondeu',    emoji: '✍️' },
  { id: 'concluiu',       label: 'Concluiu',     emoji: '✅' },
  { id: 'foi_checkout',   label: 'Foi pro checkout', emoji: '🛒' },
  { id: 'comprou',        label: 'Comprou',      emoji: '💰' },
  { id: 'perdido',        label: 'Perdido',      emoji: '❌' }
];

const PERIODOS = [
  { id: '24h',  label: 'Últimas 24h' },
  { id: '7d',   label: 'Últimos 7 dias' },
  { id: '30d',  label: 'Últimos 30 dias' },
  { id: '90d',  label: 'Últimos 90 dias' },
  { id: 'tudo', label: 'Todo o período' }
];

export default function KanbanPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [quizId, setQuizId] = useState('');
  const [leads, setLeads] = useState([]);
  const [dragLead, setDragLead] = useState(null);
  const [periodo, setPeriodo] = useState('30d');

  useEffect(() => {
    listarQuizzes().then(qs => {
      setQuizzes(qs);
      if (qs[0]) setQuizId(qs[0].id);
    });
  }, []);

  const carregar = async () => {
    if (!quizId) return;
    const { data } = await supabase
      .from('leads')
      .select('id, nome, email, telefone, status_pipeline, tags, score, criado_em, cta_clicado_em, checkout_em, comprou_em, valor_pago')
      .eq('quiz_id', quizId)
      .order('criado_em', { ascending: false });
    setLeads(data || []);
  };

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [quizId]);

  useEffect(() => {
    const corrigir = async () => {
      const semStatus = leads.filter(l => !l.status_pipeline);
      if (semStatus.length === 0) return;
      for (const l of semStatus) {
        await supabase.from('leads').update({ status_pipeline: 'novo' }).eq('id', l.id);
      }
      carregar();
    };
    if (leads.length > 0) corrigir();
  }, [leads]);

  const moverLead = async (leadId, novoStatus) => {
    await supabase.from('leads').update({
      status_pipeline: novoStatus,
      atualizado_em: new Date().toISOString()
    }).eq('id', leadId);

    await supabase.from('historico_lead').insert({
      lead_id: leadId,
      mudanca: `Movido para "${novoStatus}"`,
      detalhes: { status_anterior: dragLead?.status_pipeline, status_novo: novoStatus }
    });

    setLeads(leads.map(l => l.id === leadId ? { ...l, status_pipeline: novoStatus } : l));
    setDragLead(null);
  };

  // 🔽 Filtro por período
  const filtrarPorPeriodo = (lead) => {
    if (periodo === 'tudo') return true;
    const agora = Date.now();
    const limite = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    }[periodo];
    return (agora - new Date(lead.criado_em).getTime()) < limite;
  };

  const leadsFiltrados = leads.filter(filtrarPorPeriodo);

  const leadsPorStatus = (status) =>
    leadsFiltrados.filter(l => (l.status_pipeline || 'novo') === status);

  const totalPorStatus = (status) => leadsPorStatus(status).length;

  // 🔽 Valor total por coluna
  const valorPorStatus = (status) =>
    leadsPorStatus(status).reduce((acc, l) => acc + (Number(l.valor_pago) || 0), 0);

  // 🔽 Totais gerais
  const total = leadsFiltrados.length || 1;
  const chegouCheckout = leadsFiltrados.filter(l => ['foi_checkout', 'comprou'].includes(l.status_pipeline)).length;
  const comprou = leadsFiltrados.filter(l => l.status_pipeline === 'comprou').length;
  const valorTotal = leadsFiltrados
    .filter(l => l.status_pipeline === 'comprou')
    .reduce((acc, l) => acc + (Number(l.valor_pago) || 0), 0);

  // 🔽 Alerta de leads parados
  const leadsParados = leadsFiltrados.filter(l => {
    const dias = (Date.now() - new Date(l.criado_em).getTime()) / (1000 * 60 * 60 * 24);
    return dias >= 3 && ['novo', 'iniciou', 'respondeu'].includes(l.status_pipeline || 'novo');
  });

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Link href="/admin/crm" style={{ color: '#6B7280', fontSize: 13 }}>
          ← CRM tabela
        </Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
          📊 Pipeline Kanban
        </h1>

        <select
          value={quizId}
          onChange={e => setQuizId(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '8px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 13,
            background: '#FFF'
          }}
        >
          {quizzes.map(q => <option key={q.id} value={q.id}>{q.titulo}</option>)}
        </select>

        <select
          value={periodo}
          onChange={e => setPeriodo(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 13,
            background: '#FFF'
          }}
        >
          {PERIODOS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      {/* 🔽 Alerta de leads parados */}
      {leadsParados.length > 0 && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 13,
          color: '#991B1B',
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div>
            <b>{leadsParados.length} lead{leadsParados.length > 1 ? 's' : ''}</b> parado{leadsParados.length > 1 ? 's' : ''} há 3+ dias sem contato.
            <span style={{ color: '#B91C1C', marginLeft: 6 }}>
              Considere entrar em contato.
            </span>
          </div>
        </div>
      )}

      {/* Resumo topo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <Card titulo="Total de leads" valor={total} />
        <Card titulo="Chegaram no checkout" valor={`${chegouCheckout} (${Math.round((chegouCheckout/total)*100)}%)`} />
        <Card titulo="Compraram" valor={`${comprou} (${Math.round((comprou/total)*100)}%)`} />
        <Card titulo="Conversão" valor={`${Math.round((comprou/total)*100)}%`} destaque />
        <Card titulo="Receita total" valor={`R$ ${valorTotal.toFixed(2)}`} destaque />
      </div>

      {/* Kanban */}
      <div style={{
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 16,
        minHeight: 'calc(100vh - 380px)'
      }}>
        {COLUNAS.map(col => {
          const valor = valorPorStatus(col.id);
          return (
            <div
              key={col.id}
              onDragOver={e => e.preventDefault()}
              onDrop={() => dragLead && moverLead(dragLead.id, col.id)}
              style={{
                minWidth: 260,
                flex: '1 0 260px',
                background: '#F9FAFB',
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                padding: 12,
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Header da coluna */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '1px solid #E5E7EB',
                gap: 8
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', flex: 1, minWidth: 0 }}>
                  {col.emoji} {col.label}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    background: '#FFF',
                    color: '#6B7280',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 600,
                    display: 'inline-block'
                  }}>{totalPorStatus(col.id)}</div>
                  {valor > 0 && (
                    <div style={{
                      fontSize: 10,
                      color: '#10B981',
                      fontWeight: 700,
                      marginTop: 3
                    }}>
                      R$ {valor.toFixed(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {leadsPorStatus(col.id).map(lead => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={() => setDragLead(lead)}
                    onDragEnd={() => setDragLead(null)}
                    style={{
                      background: '#FFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 10,
                      padding: 12,
                      cursor: 'grab',
                      opacity: dragLead?.id === lead.id ? 0.5 : 1,
                      transition: 'box-shadow 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                      {lead.nome || 'Sem nome'}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: '#6B7280',
                      marginBottom: 6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {lead.email || lead.telefone || '—'}
                    </div>

                    {/* 🔽 Tags visuais */}
                    {lead.tags && lead.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                        {lead.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} style={{
                            fontSize: 9,
                            background: '#EFF6FF',
                            color: '#2563EB',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600
                          }}>{tag}</span>
                        ))}
                        {lead.tags.length > 3 && (
                          <span style={{ fontSize: 9, color: '#9CA3AF', alignSelf: 'center' }}>
                            +{lead.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Rodapé do card */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10,
                        background: '#EFF6FF',
                        color: '#2563EB',
                        padding: '2px 6px',
                        borderRadius: 4,
                        fontWeight: 600
                      }}>Score {lead.score}</span>

                      {lead.valor_pago > 0 && (
                        <span style={{
                          fontSize: 10,
                          background: '#D1FAE5',
                          color: '#065F46',
                          padding: '2px 6px',
                          borderRadius: 4,
                          fontWeight: 700
                        }}>R$ {Number(lead.valor_pago).toFixed(0)}</span>
                      )}

                      <Link
                        href={`/admin/crm/${lead.id}`}
                        style={{
                          fontSize: 10,
                          color: '#9CA3AF',
                          marginLeft: 'auto',
                          textDecoration: 'none'
                        }}
                      >
                        Abrir →
                      </Link>
                    </div>
                  </div>
                ))}

                {totalPorStatus(col.id) === 0 && (
                  <div style={{
                    textAlign: 'center',
                    color: '#D1D5DB',
                    fontSize: 11,
                    padding: '20px 0'
                  }}>
                    Arraste um lead pra cá
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ titulo, valor, destaque }) {
  return (
    <div style={{
      background: '#FFF',
      border: `1px solid ${destaque ? '#BBF7D0' : '#E5E7EB'}`,
      borderRadius: 10,
      padding: 14
    }}>
      <div style={{ fontSize: 11, color: '#6B7280' }}>{titulo}</div>
      <div style={{
        fontSize: 22,
        fontWeight: 800,
        color: destaque ? '#10B981' : '#111827',
        marginTop: 4
      }}>{valor}</div>
    </div>
  );
}