'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import TextoRico from '../ui/TextoRico';
import { supabase } from '@/lib/supabase-browser';
import { track } from '@/lib/tracking';

export default function BlocoOferta({ config = {}, tema = {}, quiz, leadId }) {
  const [restante, setRestante] = useState(
    config.duracao_minutos ? config.duracao_minutos * 60 : 900
  );

  useEffect(() => {
    const t = setInterval(() => {
      setRestante(r => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const min = String(Math.floor(restante / 60)).padStart(2, '0');
  const seg = String(restante % 60).padStart(2, '0');

  const corPadrao = tema.ctaCor || tema.destaque || '#0EA5E9';
  const corPreco = config.cor_preco || corPadrao;
  const corAntes = config.cor_antes || '#DC2626';
  const corDepois = config.cor_depois || '#16A34A';

  // Ordem padrão das seções
  const ordemDefault = ['antes_depois', 'beneficios', 'preco', 'cta', 'receber', 'garantia', 'cta_final'];
  const ordem = config.ordem_secoes || ordemDefault;

  // Quais seções mostrar
  const mostrar = {
    antes_depois: true,
    beneficios: true,
    preco: true,
    cta: true,
    receber: true,
    garantia: true,
    cta_final: true,
    ...(config.mostrar_secoes || {})
  };

  // Garantias contra config vazio
  const antesDepois = {
    antes: {},
    depois: {},
    ...(config.antes_depois || {})
  };
  const beneficios = {
    antes: [],
    depois: [],
    ...(config.beneficios || {})
  };
  const receber = Array.isArray(config.receber) ? config.receber : [];
  const garantia = config.garantia || null;

  const estiloCountdown = config.estilo_countdown || 'classico';

  /* ============================ HANDLER DO CTA ============================ */
  const handleCtaClick = async (e) => {
    e.preventDefault();

    const url = config.cta_url;
    if (!url) return;

    // 🔽 Trava: só dispara evento UMA VEZ por sessão
    const chaveClique = `cta-clicado-${quiz?.id}`;
    const jaClicou = typeof window !== 'undefined' && sessionStorage.getItem(chaveClique);

    // 1. Envia o evento SÓ SE ainda não clicou nesta sessão
    if (quiz?.id && !jaClicou) {
      try {
        await track(quiz.id, 'cta_clique', {
          cta_url: url,
          cta_texto: config.cta_texto || 'CTA principal'
        });
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(chaveClique, '1');
        }
      } catch (err) {
        console.warn('Erro ao registrar cta_clique:', err);
      }
    }

    // 2. Registra clique no lead (só 1x por sessão também)
    if (leadId && quiz?.id && !jaClicou) {
      try {
        await supabase.rpc('registrar_cta_clique', {
          p_lead_id: leadId,
          p_quiz_id: quiz.id,
          p_bloco_id: config._blocoId || null,
          p_cta_url: url,
          p_cta_texto: config.cta_texto || 'CTA principal'
        });
      } catch (err) {
        console.warn('Erro ao registrar CTA:', err);
      }
    }

    // 3. Sempre navega (mesmo se já clicou antes)
    window.location.href = url;
  };

  /* ============================ RENDERIZADORES ============================ */

  const renderTitulo = () => config.titulo && (
    <TextoRico
      key="titulo"
      texto={config.titulo}
      tema={tema}
      as="h2"
      style={{
        fontSize: tema.titulo?.resultado?.mobileSize || '24px',
        fontWeight: 800,
        color: tema.texto,
        textAlign: 'center',
        lineHeight: 1.25,
        marginBottom: 24
      }}
    />
  );

  const renderAntesDepois = () => {
    if (!mostrar.antes_depois) return null;
    if (!antesDepois.antes || !antesDepois.depois) return null;

    return (
      <div key="antes_depois" style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        marginBottom: 28
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontWeight: 700, fontSize: 13, marginBottom: 8, color: tema.texto
          }}>{antesDepois.antes.titulo || 'Você hoje'}</div>
          {antesDepois.antes.imagem_url && (
            <img
              src={antesDepois.antes.imagem_url}
              alt=""
              loading="lazy"
              decoding="async"
              style={{ width: '100%', borderRadius: 14, display: 'block' }}
            />
          )}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontWeight: 700, fontSize: 13, marginBottom: 8, color: corPadrao
          }}>{antesDepois.depois.titulo || 'Você depois'}</div>
          {antesDepois.depois.imagem_url && (
            <img
              src={antesDepois.depois.imagem_url}
              alt=""
              loading="lazy"
              decoding="async"
              style={{
                width: '100%', borderRadius: 14, display: 'block',
                boxShadow: `0 0 0 2px ${corPadrao}`
              }}
            />
          )}
        </div>
      </div>
    );
  };

  const renderBeneficios = () => {
    if (!mostrar.beneficios) return null;
    if (!beneficios.antes || !beneficios.depois) return null;
    if (beneficios.antes.length === 0 && beneficios.depois.length === 0) return null;

    return (
      <div key="beneficios" style={{ marginBottom: 28 }}>
        {beneficios.titulo && (
          <div style={{
            fontSize: 15, fontWeight: 700, color: tema.texto,
            textAlign: 'center', marginBottom: 14
          }}>{beneficios.titulo}</div>
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10
        }}>
          <div style={{
            background: `${corAntes}11`,
            border: `1px solid ${corAntes}33`,
            borderRadius: 12,
            padding: 14
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: corAntes,
              marginBottom: 10, lineHeight: 1.3
            }}>{beneficios.antes_titulo || 'Antes'}</div>
            {beneficios.antes.map((b, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                fontSize: 12, color: tema.texto, marginBottom: 8, lineHeight: 1.4
              }}>
                <span style={{ color: corAntes, fontSize: 14, lineHeight: 1 }}>●</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
          <div style={{
            background: `${corDepois}11`,
            border: `1px solid ${corDepois}33`,
            borderRadius: 12,
            padding: 14
          }}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: corDepois,
              marginBottom: 10, lineHeight: 1.3
            }}>{beneficios.depois_titulo || 'Depois'}</div>
            {beneficios.depois.map((b, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                fontSize: 12, color: tema.texto, marginBottom: 8, lineHeight: 1.4
              }}>
                <span style={{ color: corDepois, fontSize: 14, lineHeight: 1 }}>✓</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCountdown = () => {
    if (config.mostrar_countdown === false) return null;

    if (estiloCountdown === 'minimalista') {
      return (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20,
          fontSize: 22, fontWeight: 900, color: corAntes,
          fontVariantNumeric: 'tabular-nums'
        }}>
          <span>{min}</span>
          <span style={{ opacity: 0.5 }}>:</span>
          <span>{seg}</span>
        </div>
      );
    }

    if (estiloCountdown === 'redondo') {
      return (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20
        }}>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `${corAntes}15`,
              border: `3px solid ${corAntes}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 900, color: corAntes, lineHeight: 1 }}>{min}</div>
            <div style={{ fontSize: 10, color: tema.textoSuave }}>min</div>
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
            style={{
              width: 80, height: 80, borderRadius: '50%',
              background: `${corAntes}15`,
              border: `3px solid ${corAntes}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 900, color: corAntes, lineHeight: 1 }}>{seg}</div>
            <div style={{ fontSize: 10, color: tema.textoSuave }}>seg</div>
          </motion.div>
        </div>
      );
    }

    if (estiloCountdown === 'quadrado') {
      return (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 10, marginTop: 20
        }}>
          <div style={{
            background: corAntes, color: '#FFF',
            borderRadius: 10, padding: '12px 18px', minWidth: 72
          }}>
            <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{min}</div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>min</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, color: corAntes, fontWeight: 900 }}>:</div>
          <div style={{
            background: corAntes, color: '#FFF',
            borderRadius: 10, padding: '12px 18px', minWidth: 72
          }}>
            <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{seg}</div>
            <div style={{ fontSize: 10, opacity: 0.8 }}>seg</div>
          </div>
        </div>
      );
    }

    // Clássico
    return (
      <div style={{
        display: 'flex', justifyContent: 'center',
        gap: 10, marginTop: 20
      }}>
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{
            background: '#FFF',
            border: `2px solid ${corAntes}33`,
            borderRadius: 14,
            padding: '10px 18px',
            minWidth: 72,
            boxShadow: `0 4px 12px ${corAntes}22`
          }}
        >
          <div style={{
            fontSize: 32, fontWeight: 900, color: corAntes,
            lineHeight: 1, fontVariantNumeric: 'tabular-nums'
          }}>{min}</div>
          <div style={{ fontSize: 11, color: tema.textoSuave, marginTop: 4 }}>min</div>
        </motion.div>
        <div style={{
          display: 'flex', alignItems: 'center',
          fontSize: 28, color: corAntes, fontWeight: 900
        }}>:</div>
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
          style={{
            background: '#FFF',
            border: `2px solid ${corAntes}33`,
            borderRadius: 14,
            padding: '10px 18px',
            minWidth: 72,
            boxShadow: `0 4px 12px ${corAntes}22`
          }}
        >
          <div style={{
            fontSize: 32, fontWeight: 900, color: corAntes,
            lineHeight: 1, fontVariantNumeric: 'tabular-nums'
          }}>{seg}</div>
          <div style={{ fontSize: 11, color: tema.textoSuave, marginTop: 4 }}>seg</div>
        </motion.div>
      </div>
    );
  };

  const renderPreco = () => {
    if (!mostrar.preco) return null;
    if (!config.preco_de && !config.preco_por) return null;

    return (
      <motion.div
        key="preco"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        style={{
          background: '#FFF',
          border: `2px solid ${corPreco}`,
          borderRadius: 18,
          padding: '24px 20px',
          marginBottom: 24,
          textAlign: 'center',
          boxShadow: `0 8px 32px ${corPreco}22`
        }}
      >
        {config.selo && (
          <div style={{
            fontSize: 12, fontWeight: 700, color: corPreco,
            textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 10
          }}>{config.selo}</div>
        )}

        {config.pagamento_unico && (
          <div style={{
            fontSize: 14, fontWeight: 600, color: tema.texto,
            marginBottom: 8
          }}>{config.pagamento_unico}</div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
          {config.preco_de && (
            <span style={{
              fontSize: 14, color: tema.textoSuave,
              textDecoration: 'line-through'
            }}>{config.preco_de}</span>
          )}
          {config.preco_por && (
            <span style={{
              fontSize: 40, fontWeight: 900, color: corPreco, lineHeight: 1,
              letterSpacing: '-0.02em'
            }}>{config.preco_por}</span>
          )}
        </div>

        {config.parcela && (
          <div style={{ fontSize: 12, color: tema.textoSuave, marginTop: 6 }}>
            {config.parcela}
          </div>
        )}

        {renderCountdown()}
      </motion.div>
    );
  };

  const renderCTA = (variante = 'principal') => {
    if (!config.cta_url) return null;
    if (variante === 'principal' && !mostrar.cta) return null;
    if (variante === 'final' && !mostrar.cta_final) return null;

    const texto = variante === 'final'
      ? (config.cta_texto_final || config.cta_texto || 'QUERO MEU PLANO AGORA →')
      : (config.cta_texto || 'QUERO MEU PLANO AGORA →');

    return (
      <motion.a
        key={`cta-${variante}`}
        href={config.cta_url}
        onClick={handleCtaClick}
        animate={{
          scale: [1, 1.02, 1],
          boxShadow: [
            `0 8px 24px ${corPadrao}55`,
            `0 14px 40px ${corPadrao}99`,
            `0 8px 24px ${corPadrao}55`
          ]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'center',
          padding: '20px 24px',
          background: corPadrao,
          color: tema.modoEscuro ? tema.fundo : '#FFFFFF',
          borderRadius: 16,
          fontWeight: 800,
          fontSize: 17,
          textDecoration: 'none',
          letterSpacing: '0.3px',
          marginBottom: 24,
          cursor: 'pointer'
        }}
      >
        {texto}
      </motion.a>
    );
  };

  const renderReceber = () => {
    if (!mostrar.receber) return null;
    if (receber.length === 0) return null;

    return (
      <div key="receber" style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 20, fontWeight: 800, color: tema.texto,
          textAlign: 'center', marginBottom: 6
        }}>
          {config.receber_titulo || 'Veja tudo o que você vai receber'}
        </div>
        {config.receber_subtitulo && (
          <div style={{
            fontSize: 14, color: tema.textoSuave,
            textAlign: 'center', marginBottom: 20
          }}>{config.receber_subtitulo}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {receber.map((item, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'center',
              padding: 14,
              background: tema.cardFundo || '#FFF',
              border: `1px solid ${tema.cardBorda || '#E5E7EB'}`,
              borderRadius: 12
            }}>
              {item.imagem_url ? (
                <img
                  src={item.imagem_url}
                  alt="" decoding="async"
                  loading="lazy"
                  style={{
                    width: 72, height: 72, objectFit: 'cover',
                    borderRadius: 10, flexShrink: 0
                  }}
                />
              ) : (
                <div style={{
                  width: 56, height: 56, borderRadius: 10,
                  background: `${corDepois}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 28
                }}>{item.emoji || '✅'}</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 700, fontSize: 15, color: tema.texto,
                  marginBottom: 4
                }}>{item.titulo}</div>
                {item.descricao && (
                  <div style={{
                    fontSize: 13, color: tema.textoSuave, lineHeight: 1.5
                  }}>{item.descricao}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {config.imagem_produto && (
          <img
            src={config.imagem_produto}
            alt=""
            loading="lazy"
            decoding="async"
            style={{
              width: '100%', borderRadius: 14,
              marginTop: 20, display: 'block'
            }}
          />
        )}
      </div>
    );
  };

  const renderGarantia = () => {
    if (!mostrar.garantia) return null;
    if (!garantia) return null;

    return (
      <div key="garantia" style={{
        background: `${corDepois}11`,
        border: `1px solid ${corDepois}33`,
        borderRadius: 14,
        padding: 18,
        marginBottom: 24,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🛡️</div>
        <div style={{
          fontSize: 15, fontWeight: 700, color: corDepois, marginBottom: 6
        }}>{garantia.titulo || 'Garantia de 7 dias'}</div>
        <div style={{
          fontSize: 13, color: tema.texto, lineHeight: 1.6
        }}>{garantia.texto}</div>
      </div>
    );
  };

  const renderHTML = () => config.html_livre && (
    <div
      key="html"
      style={{ marginTop: 24 }}
      dangerouslySetInnerHTML={{ __html: config.html_livre }}
    />
  );

  /* ============================ MAPA DE SEÇÕES ============================ */
  const secoes = {
    antes_depois: renderAntesDepois,
    beneficios: renderBeneficios,
    preco: renderPreco,
    cta: () => renderCTA('principal'),
    receber: renderReceber,
    garantia: renderGarantia,
    cta_final: () => renderCTA('final'),
    html: renderHTML
  };

  return (
    <div>
      {renderTitulo()}
      {ordem.map(chave => secoes[chave] ? secoes[chave]() : null)}
    </div>
  );
}