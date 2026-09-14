'use client';
import { useState, useEffect } from 'react';
import { Reorder } from 'framer-motion';
import {
  criarBloco, deletarBloco, atualizarBloco, reordenarBlocos
} from '@/lib/quiz2';

import FormBlocoIntro from './forms/FormBlocoIntro';
import FormBlocoPergunta from './forms/FormBlocoPergunta';
import FormBlocoConteudo from './forms/FormBlocoConteudo';
import FormBlocoProvaSocial from './forms/FormBlocoProvaSocial';
import FormBlocoLoading from './forms/FormBlocoLoading';
import FormBlocoCaptura from './forms/FormBlocoCaptura';
import FormBlocoResultado from './forms/FormBlocoResultado';
import FormBlocoHTML from './forms/FormBlocoHTML';
import FormBlocoOferta from './forms/FormBlocoOferta';
import FormBlocoGrafico from './forms/FormBlocoGrafico';
import FormBlocoAntesDepois from './forms/FormBlocoAntesDepois';
import FormBlocoRelatorio from './forms/FormBlocoRelatorio';

// Array usado no painel lateral (draggable)
const TIPOS = [
  { id: 'intro',                 emoji: '🎬', nome: 'Intro' },
  { id: 'pergunta',              emoji: '❓', nome: 'Pergunta' },
  { id: 'conteudo',              emoji: '📄', nome: 'Conteúdo' },
  { id: 'antes_depois',          emoji: '🖼️', nome: 'Antes/Depois' },
  { id: 'grafico',               emoji: '📊', nome: 'Gráfico' },
  { id: 'relatorio_diagnostico', emoji: '📊', nome: 'Relatório' },
  { id: 'prova_social',          emoji: '⭐', nome: 'Prova social' },
  { id: 'loading',               emoji: '⏳', nome: 'Loading' },
  { id: 'captura',               emoji: '📝', nome: 'Captura' },
  { id: 'resultado',             emoji: '🎯', nome: 'Resultado' },
  { id: 'oferta',                emoji: '💰', nome: 'Oferta' },
  { id: 'html',                  emoji: '🧩', nome: 'HTML livre' }
];

// Objeto usado pra lookup rápido (emoji + nome por tipo)
const INFO_TIPO = Object.fromEntries(TIPOS.map(t => [t.id, t]));

export default function EditorBlocos({ quiz, blocos, onRecarregar, onMudouPreview }) {
  const [expandido, setExpandido] = useState(null);
  const [listaLocal, setListaLocal] = useState(blocos);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    setListaLocal(blocos);
  }, [blocos]);

  const removerBloco = async (id) => {
    if (!confirm('Excluir esse bloco?')) return;

    const listaSemEle = listaLocal.filter(b => b.id !== id);
    setListaLocal(listaSemEle);

    try {
      await deletarBloco(id);
      onMudouPreview();
    } catch (err) {
      setListaLocal(blocos);
      alert('Erro ao excluir: ' + err.message);
    }
  };

  const handleReorder = async (novaLista) => {
    setListaLocal(novaLista);
    const novaOrdem = novaLista.map((b, i) => ({ id: b.id, ordem: i + 1 }));
    await reordenarBlocos(novaOrdem);
    onMudouPreview();
  };

  const salvarConfig = async (id, config) => {
    setListaLocal(prev =>
      prev.map(b => b.id === id ? { ...b, config } : b)
    );
    await atualizarBloco(id, { config });
    onMudouPreview();
  };

  const handleDropNovo = async (e, index) => {
    e.preventDefault();
    const tipo = e.dataTransfer.getData('bloco-tipo');
    if (!tipo) return;
    setDragOverIndex(null);

    try {
      const novo = await criarBloco(quiz.id, tipo, {});
      const listaAtualizada = [...listaLocal];
      listaAtualizada.splice(index, 0, novo);
      setListaLocal(listaAtualizada);

      await reordenarBlocos(listaAtualizada.map((b, idx) => ({ id: b.id, ordem: idx + 1 })));

      await onRecarregar();
      onMudouPreview();
      setExpandido(novo.id);
    } catch (err) {
      alert('Erro ao adicionar bloco: ' + err.message);
    }
  };

  const renderForm = (bloco) => {
    const props = {
      config: bloco.config || {},
      onChange: (nova) => salvarConfig(bloco.id, nova),
      quiz
    };
    switch (bloco.tipo) {
      case 'intro':                 return <FormBlocoIntro {...props} />;
      case 'pergunta':              return <FormBlocoPergunta {...props} />;
      case 'conteudo':              return <FormBlocoConteudo {...props} />;
      case 'prova_social':          return <FormBlocoProvaSocial {...props} />;
      case 'loading':               return <FormBlocoLoading {...props} />;
      case 'captura':               return <FormBlocoCaptura {...props} />;
      case 'resultado':             return <FormBlocoResultado {...props} />;
      case 'html':                  return <FormBlocoHTML {...props} />;
      case 'oferta':                return <FormBlocoOferta {...props} />;
      case 'grafico':               return <FormBlocoGrafico {...props} />;
      case 'antes_depois':          return <FormBlocoAntesDepois {...props} />;
      case 'relatorio_diagnostico': return <FormBlocoRelatorio {...props} />;
      default:                      return <div>Tipo desconhecido</div>;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16, alignItems: 'start' }}>

      {/* ============ PAINEL LATERAL DE TIPOS ============ */}
      <aside style={{
        position: 'sticky',
        top: 20,
        background: '#FFF',
        border: '1px solid #E5E7EB',
        borderRadius: 12,
        padding: 12,
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto'
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#6B7280',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 10
        }}>
          Blocos
        </div>
        <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 10, lineHeight: 1.4 }}>
          Arraste pra dentro do fluxo →
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {TIPOS.map(t => (
            <div
              key={t.id}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('bloco-tipo', t.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                border: '1px solid #E5E7EB',
                borderRadius: 8,
                cursor: 'grab',
                background: '#FAFAFA',
                transition: 'all 0.15s',
                userSelect: 'none'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#EFF6FF';
                e.currentTarget.style.borderColor = '#3B82F6';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#FAFAFA';
                e.currentTarget.style.borderColor = '#E5E7EB';
              }}
            >
              <span style={{ fontSize: 16 }}>{t.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#111827',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {t.nome}
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ============ FLUXO ============ */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>
            Fluxo do funil ({listaLocal.length} blocos)
          </h2>
        </div>

        {/* Zona de drop no topo */}
        <div
          onDragOver={e => {
            if (e.dataTransfer.types.includes('bloco-tipo')) {
              e.preventDefault();
              setDragOverIndex(0);
            }
          }}
          onDragLeave={() => setDragOverIndex(null)}
          onDrop={e => handleDropNovo(e, 0)}
          style={{
            height: 8,
            background: dragOverIndex === 0 ? '#3B82F6' : 'transparent',
            borderRadius: 4,
            marginBottom: 4,
            transition: 'background 0.15s'
          }}
        />

        {listaLocal.length === 0 ? (
          <div
            onDragOver={e => {
              if (e.dataTransfer.types.includes('bloco-tipo')) {
                e.preventDefault();
                setDragOverIndex(0);
              }
            }}
            onDrop={e => handleDropNovo(e, 0)}
            style={{
              padding: 60,
              textAlign: 'center',
              color: dragOverIndex === 0 ? '#3B82F6' : '#9CA3AF',
              border: `2px dashed ${dragOverIndex === 0 ? '#3B82F6' : '#E5E7EB'}`,
              borderRadius: 12,
              fontSize: 14,
              background: dragOverIndex === 0 ? '#EFF6FF' : 'transparent',
              transition: 'all 0.15s'
            }}
          >
            {dragOverIndex === 0 ? '↓ Solte aqui pra começar' : 'Arraste um bloco da esquerda pra cá'}
          </div>
        ) : (
          <Reorder.Group
            axis="y"
            values={listaLocal}
            onReorder={handleReorder}
            style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {listaLocal.map((bloco, i) => {
              const info = INFO_TIPO[bloco.tipo] || { emoji: '❓', nome: bloco.tipo };
              const aberto = expandido === bloco.id;
              return (
                <Reorder.Item key={bloco.id} value={bloco}>
                  {/* Zona de drop entre blocos */}
                  <div
                    onDragOver={e => {
                      if (e.dataTransfer.types.includes('bloco-tipo')) {
                        e.preventDefault();
                        setDragOverIndex(i);
                      }
                    }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={e => handleDropNovo(e, i)}
                    style={{
                      height: 4,
                      background: dragOverIndex === i ? '#3B82F6' : 'transparent',
                      borderRadius: 2,
                      marginBottom: 4,
                      transition: 'background 0.15s'
                    }}
                  />

                  <div style={{
                    background: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: 12,
                    overflow: 'hidden'
                  }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px 16px',
                        gap: 10,
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandido(aberto ? null : bloco.id)}
                    >
                      <span style={{ cursor: 'grab', color: '#9CA3AF', fontSize: 18 }}>⋮⋮</span>
                      <span style={{ fontSize: 20 }}>{info.emoji}</span>
                      <div style={{ flex: 1 }}>
                        {(() => {
                          const c = bloco.config || {};
                          const temProblema =
                            (bloco.tipo === 'pergunta' && !c.pergunta_id) ||
                            (bloco.tipo !== 'pergunta' && !c.titulo && !c.texto && !c.html && !c.antes_depois && !c.beneficios && !c.faixas && !c.receber && !c.secoes);
                          const cor = temProblema ? '#DC2626' : '#111827';

                          return (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, color: cor }}>
                                #{i + 1} · {info.nome} {temProblema && '⚠️'}
                              </div>
                              <div style={{ fontSize: 11, color: temProblema ? '#DC2626' : '#9CA3AF' }}>
                                {resumo(bloco)}
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removerBloco(bloco.id); }}
                        style={{
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: '#DC2626', fontSize: 14, padding: 4
                        }}
                      >Excluir</button>
                    </div>

                    {aberto && (
                      <div style={{
                        padding: 16,
                        background: '#F9FAFB',
                        borderTop: '1px solid #E5E7EB'
                      }}>
                        {renderForm(bloco)}
                      </div>
                    )}
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}

        {/* Zona de drop no final */}
        <div
          onDragOver={e => {
            if (e.dataTransfer.types.includes('bloco-tipo')) {
              e.preventDefault();
              setDragOverIndex(listaLocal.length);
            }
          }}
          onDragLeave={() => setDragOverIndex(null)}
          onDrop={e => handleDropNovo(e, listaLocal.length)}
          style={{
            height: 40,
            border: dragOverIndex === listaLocal.length ? '2px dashed #3B82F6' : '2px dashed #E5E7EB',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: dragOverIndex === listaLocal.length ? '#3B82F6' : '#9CA3AF',
            fontSize: 12,
            fontWeight: 500,
            marginTop: 8,
            transition: 'all 0.15s',
            background: dragOverIndex === listaLocal.length ? '#EFF6FF' : 'transparent'
          }}
        >
          {dragOverIndex === listaLocal.length ? '↓ Solte aqui' : '+ Arraste mais um bloco pra cá'}
        </div>
      </div>
    </div>
  );
}

function resumo(bloco) {
  const c = bloco.config || {};

  if (bloco.tipo === 'pergunta') {
    if (!c.pergunta_id) return '❌ Sem pergunta vinculada';
    if (bloco.pergunta) return `✅ ${bloco.pergunta.texto?.slice(0, 60) || 'Pergunta ok'}`;
    return '✅ Pergunta vinculada';
  }

  if (c.titulo) return c.titulo.slice(0, 60) + (c.titulo.length > 60 ? '…' : '');
  if (c.texto)  return c.texto.slice(0, 60) + (c.texto.length > 60 ? '…' : '');
  if (c.html)   return c.html.slice(0, 60).replace(/<[^>]+>/g, '') + '…';
  if (c.secoes) return `${c.secoes.length} seções de relatório`;
  return '⚠️ Sem conteúdo configurado';
}