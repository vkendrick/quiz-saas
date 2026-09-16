'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function BlocoPergunta({
  config = {},
  tema = {},
  pergunta,
  respostas = {},
  onResponder,
  voltar,
  indiceAtual = 0
}) {
  const [selecionada, setSelecionada] = useState(() => {
    if (!pergunta) return null;
    const anterior = respostas[pergunta.id];
    if (pergunta.tipo === 'multipla') return anterior || [];
    return anterior || null;
  });
  const [hoverId, setHoverId] = useState(null);

  if (!pergunta) return <BlocoAviso tipo="sem_pergunta" />;
  if (!pergunta.opcoes || pergunta.opcoes.length === 0) {
    return <BlocoAviso tipo="sem_opcoes" pergunta={pergunta} />;
  }

  const isMultipla = pergunta.tipo === 'multipla';
  const corPrincipal = tema.ctaCor || tema.destaque || '#0EA5E9';
  const raioCard = tema.cardRaio || 14;
  const bordaCard = tema.cardBorda || '#E5E7EB';
  const todasTemImagem = pergunta.opcoes.every(op => op.imagem_url);
  const muitasOpcoes = isMultipla && pergunta.opcoes.length >= 6;

  const handleClick = (opcao) => {
    if (isMultipla) {
      setSelecionada(prev => {
        const lista = Array.isArray(prev) ? prev : [];
        if (lista.includes(opcao.id)) {
          return lista.filter(id => id !== opcao.id);
        }
        return [...lista, opcao.id];
      });
    } else {
      if (selecionada) return;
      setSelecionada(opcao.id);
      setTimeout(() => onResponder?.(opcao.id, opcao), 220);
    }
  };

  const handleContinuar = () => {
    if (!isMultipla) return;
    const ids = Array.isArray(selecionada) ? selecionada : [];
    if (ids.length === 0) return;

    const opcoesMarcadas = pergunta.opcoes.filter(o => ids.includes(o.id));
    const valorAgregado = opcoesMarcadas.reduce((acc, o) => acc + (o.valor || 0), 0);

    onResponder?.(ids, {
      multipla: true,
      opcoes: opcoesMarcadas,
      valor_agregado: valorAgregado
    });
  };

  const isSelecionada = (opcaoId) => {
    if (isMultipla) {
      return Array.isArray(selecionada) && selecionada.includes(opcaoId);
    }
    return selecionada === opcaoId;
  };

  const qtdSelecionadas = isMultipla && Array.isArray(selecionada) ? selecionada.length : 0;
  const textoPergunta = pergunta.variantes?.[0]?.texto || pergunta.texto;

  return (
    <div>
      {/* Header: voltar + contador */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        minHeight: 24
      }}>
        {indiceAtual > 0 ? (
          <button
            onClick={voltar}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: tema.textoRodape, fontSize: 14, padding: 0
            }}
          >
            ← Voltar
          </button>
        ) : <div />}

        {isMultipla && (
          <span style={{
            fontSize: 12,
            color: qtdSelecionadas > 0 ? corPrincipal : tema.textoSuave,
            fontWeight: 600
          }}>
            {qtdSelecionadas > 0
              ? `${qtdSelecionadas} selecionada${qtdSelecionadas > 1 ? 's' : ''}`
              : 'Selecione uma ou mais'}
          </span>
        )}
      </div>

      <h2 style={{
        fontSize: tema.titulo?.pergunta?.mobileSize || '22px',
        fontWeight: tema.titulo?.pergunta?.weight || 700,
        lineHeight: tema.titulo?.pergunta?.line || 1.3,
        color: tema.texto,
        marginBottom: 8
      }}>
        {textoPergunta}
      </h2>

      {isMultipla && (
        <p style={{
          fontSize: 13,
          color: tema.textoSuave,
          marginBottom: 20,
          fontStyle: 'italic'
        }}>
          Você pode marcar mais de uma opção
        </p>
      )}

      {config.html_acima && (
        <div
          style={{ marginBottom: 20 }}
          dangerouslySetInnerHTML={{ __html: config.html_acima }}
        />
      )}

{pergunta.imagem_url && (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    marginBottom: 20
  }}>
    <img
      src={pergunta.imagem_url}
      alt=""
      loading="lazy"
      style={{
        maxWidth: '100%',
        maxHeight: 180,
        width: 'auto',
        height: 'auto',
        borderRadius: 12,
        objectFit: 'contain'
      }}
    />
  </div>
)}
      {/* Grid */}
      <div style={
        todasTemImagem
          ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
          : muitasOpcoes
            ? { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }
            : { display: 'flex', flexDirection: 'column', gap: 12 }
      }>
        {pergunta.opcoes.map((op, i) => {
          const sel = isSelecionada(op.id);
          const isHover = hoverId === op.id;

          if (todasTemImagem) {
            return (
              <motion.button
                key={op.id}
                type="button"
                onClick={() => handleClick(op)}
                onMouseEnter={() => setHoverId(op.id)}
                onMouseLeave={() => setHoverId(null)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.25 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  padding: 0,
                  background: tema.cardFundo || '#FFF',
                  border: `2px solid ${sel ? corPrincipal : (isHover ? corPrincipal : bordaCard)}`,
                  borderRadius: raioCard,
                  cursor: 'pointer',
                  overflow: 'hidden',
                  textAlign: 'left',
                  display: 'block',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                  boxShadow: sel
                    ? '0 4px 16px rgba(0,0,0,0.12)'
                    : '0 1px 2px rgba(0,0,0,0.03)',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              >
                <img
                  src={op.imagem_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />
                <div style={{
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}>
                  <span style={{
                    width: 20, height: 20,
                    borderRadius: isMultipla ? 6 : '50%',
                    border: `2px solid ${sel ? corPrincipal : bordaCard}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: sel ? corPrincipal : '#FFF',
                    transition: 'background 0.15s'
                  }}>
                    {sel && (
                      <span style={{ color: '#FFF', fontSize: 12, lineHeight: 1 }}>✓</span>
                    )}
                  </span>
                  <span style={{
                    fontSize: 14, fontWeight: 500,
                    color: tema.texto, lineHeight: 1.3
                  }}>{op.texto}</span>
                </div>
              </motion.button>
            );
          }

          return (
            <motion.button
              key={op.id}
              type="button"
              onClick={() => handleClick(op)}
              onMouseEnter={() => setHoverId(op.id)}
              onMouseLeave={() => setHoverId(null)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              style={{
                padding: muitasOpcoes ? '12px 10px' : (tema.cardPadding || '18px 22px'),
                background: sel
                  ? `${corPrincipal}10`
                  : (isHover ? `${corPrincipal}05` : (tema.cardFundo || '#FFF')),
                border: `2px solid ${sel ? corPrincipal : (isHover ? corPrincipal : bordaCard)}`,
                borderRadius: raioCard,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: muitasOpcoes ? 'column' : 'row',
                alignItems: 'center',
                gap: muitasOpcoes ? 6 : 14,
                fontSize: muitasOpcoes ? 12 : 16,
                color: tema.texto,
                textAlign: muitasOpcoes ? 'center' : 'left',
                transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
                boxShadow: sel
                  ? '0 4px 16px rgba(0,0,0,0.12)'
                  : '0 1px 2px rgba(0,0,0,0.03)',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            >
              {/* Check/Radio */}
              {isMultipla ? (
                <span style={{
                  width: 22, height: 22,
                  borderRadius: 6,
                  border: `2px solid ${sel ? corPrincipal : bordaCard}`,
                  background: sel ? corPrincipal : '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s'
                }}>
                  {sel && <span style={{ color: '#FFF', fontSize: 13, lineHeight: 1 }}>✓</span>}
                </span>
              ) : (
                <span style={{
                  width: 20, height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${sel ? corPrincipal : bordaCard}`,
                  background: sel ? corPrincipal : '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s'
                }}>
                  {sel && <span style={{ color: '#FFF', fontSize: 11, lineHeight: 1 }}>✓</span>}
                </span>
              )}

              {op.emoji && (
                <span style={{ fontSize: muitasOpcoes ? 20 : 24, lineHeight: 1 }}>{op.emoji}</span>
              )}
              {op.imagem_url && !todasTemImagem && (
                <img
                  src={op.imagem_url}
                  alt=""
                  loading="lazy"
                  style={{
                    width: 56, height: 56, objectFit: 'cover', borderRadius: 10
                  }}
                />
              )}
              <span style={{
                flex: muitasOpcoes ? 'none' : 1,
                fontWeight: 500,
                fontSize: muitasOpcoes ? 12 : 14,
                lineHeight: 1.3,
                textAlign: muitasOpcoes ? 'center' : 'left'
              }}>{op.texto}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Botão "Continuar" — só na múltipla */}
      {isMultipla && (
        <motion.button
          type="button"
          onClick={handleContinuar}
          disabled={qtdSelecionadas === 0}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={qtdSelecionadas > 0 ? { scale: 1.01 } : {}}
          whileTap={qtdSelecionadas > 0 ? { scale: 0.98 } : {}}
          style={{
            width: '100%',
            marginTop: 24,
            padding: tema.botaoPaddingMobile || tema.botaoPadding || '18px 24px',
            background: qtdSelecionadas === 0
              ? (tema.modoEscuro ? tema.cardFundo : '#E5E7EB')
              : corPrincipal,
            color: qtdSelecionadas === 0 ? tema.textoSuave : '#FFFFFF',
            border: 'none',
            borderRadius: tema.botaoRaio || 14,
            fontSize: 16,
            fontWeight: 700,
            cursor: qtdSelecionadas === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
            fontFamily: 'inherit',
            letterSpacing: '0.3px'
          }}
        >
          {qtdSelecionadas === 0
            ? 'Selecione pelo menos 1 opção'
            : `Continuar (${qtdSelecionadas}) →`}
        </motion.button>
      )}

      {config.html_abaixo && (
        <div
          style={{ marginTop: 20 }}
          dangerouslySetInnerHTML={{ __html: config.html_abaixo }}
        />
      )}
    </div>
  );
}

function BlocoAviso({ tipo, pergunta }) {
  return (
    <div style={{
      padding: 24,
      background: '#FEF3C7',
      border: '2px solid #FDE68A',
      borderRadius: 12,
      fontSize: 14,
      color: '#92400E',
      lineHeight: 1.6
    }}>
      {tipo === 'sem_pergunta' ? (
        <>
          <b>⚠️ Bloco sem pergunta vinculada</b>
          <p style={{ marginTop: 8, marginBottom: 12 }}>
            Esse bloco não está apontando pra nenhuma pergunta. Provavelmente
            a pergunta foi deletada ou o vínculo se perdeu.
          </p>
          <p style={{ fontSize: 12, color: '#78350F' }}>
            <b>Como resolver:</b> no admin, edite este bloco e selecione uma pergunta.
          </p>
        </>
      ) : (
        <>
          <b>⚠️ Pergunta sem opções</b>
          <p style={{ marginTop: 8 }}>{pergunta?.texto}</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>
            Essa pergunta está cadastrada mas não tem opções de resposta.
          </p>
        </>
      )}
    </div>
  );
}