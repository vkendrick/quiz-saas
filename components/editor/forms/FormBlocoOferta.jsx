'use client';
import SeletorImagem from '../SeletorImagem';
import { useState } from 'react';

const input = { width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, outline: 'none' };
const textarea = { ...input, fontFamily: 'inherit', resize: 'vertical' };
const Campo = ({ label, children, hint }) => (
  <label style={{ display: 'block' }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>{label}</div>
    {children}
    {hint && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>{hint}</div>}
  </label>
);

const Secao = ({ titulo, children, aberta: abertaInicial = false }) => {
  const [aberta, setAberta] = useState(abertaInicial);
  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, marginBottom: 10 }}>
      <button
        type="button"
        onClick={() => setAberta(!aberta)}
        style={{
          width: '100%', textAlign: 'left', padding: '10px 14px',
          background: '#F9FAFB', border: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, color: '#111827',
          display: 'flex', justifyContent: 'space-between'
        }}
      >
        <span>{titulo}</span>
        <span style={{ color: '#9CA3AF' }}>{aberta ? '▲' : '▼'}</span>
      </button>
      {aberta && <div style={{ padding: 14 }}>{children}</div>}
    </div>
  );
};

export default function FormBlocoOferta({ config, onChange }) {
  const set = (patch) => onChange({ ...config, ...patch });
  const antesDepois = config.antes_depois || { antes: {}, depois: {} };
  const beneficios = config.beneficios || { antes: [], depois: [] };
  const receber = config.receber || [];
  const garantia = config.garantia || {};
  const mostrarSecoes = config.mostrar_secoes || {};

  const setMostrar = (chave, valor) => set({ mostrar_secoes: { ...mostrarSecoes, [chave]: valor } });

  const setBeneficio = (lado, i, valor) => {
    const lista = [...(beneficios[lado] || [])];
    lista[i] = valor;
    set({ beneficios: { ...beneficios, [lado]: lista } });
  };
  const addBeneficio = (lado) => set({
    beneficios: { ...beneficios, [lado]: [...(beneficios[lado] || []), ''] }
  });
  const rmBeneficio = (lado, i) => set({
    beneficios: { ...beneficios, [lado]: (beneficios[lado] || []).filter((_, j) => j !== i) }
  });

  const setReceber = (i, patch) => {
    const lista = [...receber];
    lista[i] = { ...lista[i], ...patch };
    set({ receber: lista });
  };
  const addReceber = () => set({ receber: [...receber, { emoji: '✅', titulo: '', descricao: '' }] });
  const rmReceber = (i) => set({ receber: receber.filter((_, j) => j !== i) });

  return (
    <div style={{ display: 'grid', gap: 12 }}>

      <Campo label="Título da oferta">
        <input value={config.titulo || ''} onChange={e => set({ titulo: e.target.value })}
          style={input} placeholder="Seu protocolo está pronto!" />
      </Campo>

      {/* ANTES / DEPOIS */}
      <Secao titulo="🖼️ Antes / Depois" aberta={!!antesDepois.antes?.imagem_url}>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>Antes</div>
              <input
                value={antesDepois.antes?.titulo || ''}
                onChange={e => set({ antes_depois: { ...antesDepois, antes: { ...(antesDepois.antes || {}), titulo: e.target.value } } })}
                placeholder="Você hoje" style={{ ...input, marginBottom: 6 }} />
              <SeletorImagem
                valor={antesDepois.antes?.imagem_url}
                onChange={v => set({ antes_depois: { ...antesDepois, antes: { ...(antesDepois.antes || {}), imagem_url: v } } })}
                pasta="oferta/antes" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>Depois</div>
              <input
                value={antesDepois.depois?.titulo || ''}
                onChange={e => set({ antes_depois: { ...antesDepois, depois: { ...(antesDepois.depois || {}), titulo: e.target.value } } })}
                placeholder="Você depois" style={{ ...input, marginBottom: 6 }} />
              <SeletorImagem
                valor={antesDepois.depois?.imagem_url}
                onChange={v => set({ antes_depois: { ...antesDepois, depois: { ...(antesDepois.depois || {}), imagem_url: v } } })}
                pasta="oferta/depois" />
            </div>
          </div>
          <Toggle label="Mostrar essa seção" valor={mostrarSecoes.antes_depois !== false}
            onChange={v => setMostrar('antes_depois', v)} />
        </div>
      </Secao>

      {/* BENEFÍCIOS */}
      <Secao titulo="📊 Benefícios (Antes / Depois)" aberta={!!beneficios.antes?.length}>
        <div style={{ display: 'grid', gap: 10 }}>
          <Campo label="Título da seção">
            <input value={beneficios.titulo || ''} onChange={e => set({ beneficios: { ...beneficios, titulo: e.target.value } })}
              style={input} placeholder="Veja os benefícios para você:" />
          </Campo>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#DC2626', marginBottom: 4 }}>🔴 Antes</div>
              <input value={beneficios.antes_titulo || ''} onChange={e => set({ beneficios: { ...beneficios, antes_titulo: e.target.value } })}
                placeholder="Antes do plano" style={{ ...input, marginBottom: 6 }} />
              {(beneficios.antes || []).map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input value={b} onChange={e => setBeneficio('antes', i, e.target.value)}
                    placeholder="Benefício" style={{ ...input, flex: 1 }} />
                  <button type="button" onClick={() => rmBeneficio('antes', i)}
                    style={{ background: '#FEE2E2', border: 'none', color: '#DC2626', padding: '0 8px', borderRadius: 6, cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <button type="button" onClick={() => addBeneficio('antes')}
                style={{ fontSize: 11, color: '#DC2626', background: 'none', border: '1px dashed #FCA5A5', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', marginTop: 4 }}>+ adicionar</button>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#16A34A', marginBottom: 4 }}>✅ Depois</div>
              <input value={beneficios.depois_titulo || ''} onChange={e => set({ beneficios: { ...beneficios, depois_titulo: e.target.value } })}
                placeholder="Depois do plano" style={{ ...input, marginBottom: 6 }} />
              {(beneficios.depois || []).map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  <input value={b} onChange={e => setBeneficio('depois', i, e.target.value)}
                    placeholder="Benefício" style={{ ...input, flex: 1 }} />
                  <button type="button" onClick={() => rmBeneficio('depois', i)}
                    style={{ background: '#DCFCE7', border: 'none', color: '#16A34A', padding: '0 8px', borderRadius: 6, cursor: 'pointer' }}>×</button>
                </div>
              ))}
              <button type="button" onClick={() => addBeneficio('depois')}
                style={{ fontSize: 11, color: '#16A34A', background: 'none', border: '1px dashed #86EFAC', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', marginTop: 4 }}>+ adicionar</button>
            </div>
          </div>

          <Toggle label="Mostrar essa seção" valor={mostrarSecoes.beneficios !== false}
            onChange={v => setMostrar('beneficios', v)} />
        </div>
      </Secao>

      {/* PREÇO */}
      <Secao titulo="💰 Preço e Countdown" aberta={!!config.preco_por}>
        <div style={{ display: 'grid', gap: 8 }}>
          <Campo label="Selo (acima do preço)">
            <input value={config.selo || ''} onChange={e => set({ selo: e.target.value })}
              style={input} placeholder="🔥 Super desconto do mês" />
          </Campo>
          <Campo label="Texto do pagamento">
            <input value={config.pagamento_unico || ''} onChange={e => set({ pagamento_unico: e.target.value })}
              style={input} placeholder="Pagamento único · acesso 12 meses" />
          </Campo>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <Campo label="Preço 'de'">
              <input value={config.preco_de || ''} onChange={e => set({ preco_de: e.target.value })}
                style={input} placeholder="R$ 197" />
            </Campo>
            <Campo label="Preço 'por'">
              <input value={config.preco_por || ''} onChange={e => set({ preco_por: e.target.value })}
                style={input} placeholder="R$ 67,90" />
            </Campo>
            <Campo label="Parcela">
              <input value={config.parcela || ''} onChange={e => set({ parcela: e.target.value })}
                style={input} placeholder="à vista" />
            </Campo>
          </div>

          <Toggle label="Mostrar countdown" valor={config.mostrar_countdown !== false}
            onChange={v => set({ mostrar_countdown: v })} />

          {config.mostrar_countdown !== false && (
            <>
              <Campo label="Duração (minutos)">
                <input type="number" value={config.duracao_minutos || 15}
                  onChange={e => set({ duracao_minutos: parseInt(e.target.value) || 15 })}
                  style={input} />
              </Campo>
              <Campo label="Estilo do countdown">
                <select value={config.estilo_countdown || 'classico'}
                  onChange={e => set({ estilo_countdown: e.target.value })}
                  style={input}>
                  <option value="classico">Clássico (caixinhas)</option>
                  <option value="quadrado">Quadrado (colorido)</option>
                  <option value="redondo">Redondo (círculos)</option>
                  <option value="minimalista">Minimalista (só números)</option>
                </select>
              </Campo>
            </>
          )}

          <Toggle label="Mostrar essa seção" valor={mostrarSecoes.preco !== false}
            onChange={v => setMostrar('preco', v)} />
        </div>
      </Secao>

      {/* CTA */}
      <Secao titulo="🎯 Botão de ação (CTA)" aberta={!!config.cta_url}>
        <div style={{ display: 'grid', gap: 8 }}>
          <Campo label="URL do botão">
            <input value={config.cta_url || ''} onChange={e => set({ cta_url: e.target.value })}
              style={input} placeholder="https://seu-checkout.com" />
          </Campo>
          <Campo label="Texto do botão principal">
            <input value={config.cta_texto || ''} onChange={e => set({ cta_texto: e.target.value })}
              style={input} placeholder="QUERO MEU PROTOCOLO AGORA →" />
          </Campo>
          <Campo label="Texto do botão final (opcional)">
            <input value={config.cta_texto_final || ''} onChange={e => set({ cta_texto_final: e.target.value })}
              style={input} placeholder="Se vazio, repete o principal" />
          </Campo>
          <Toggle label="Mostrar botão principal" valor={mostrarSecoes.cta !== false}
            onChange={v => setMostrar('cta', v)} />
          <Toggle label="Mostrar botão final (no rodapé)" valor={config.mostrar_cta_final !== false}
            onChange={v => set({ mostrar_cta_final: v })} />
        </div>
      </Secao>

      {/* O QUE RECEBER */}
      <Secao titulo="🎁 O que vai receber" aberta={receber.length > 0}>
        <div style={{ display: 'grid', gap: 8 }}>
          <Campo label="Título da seção">
            <input value={config.receber_titulo || ''} onChange={e => set({ receber_titulo: e.target.value })}
              style={input} placeholder="Veja tudo o que você vai receber" />
          </Campo>
          <Campo label="Subtítulo">
            <input value={config.receber_subtitulo || ''} onChange={e => set({ receber_subtitulo: e.target.value })}
              style={input} placeholder="Plano completo..." />
          </Campo>
          <Campo label="Imagem do produto (mockup)">
            <SeletorImagem valor={config.imagem_produto} onChange={v => set({ imagem_produto: v })} pasta="oferta/produto" />
          </Campo>

          {receber.map((item, i) => (
            <div key={i} style={{ padding: 10, background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input value={item.emoji || ''} onChange={e => setReceber(i, { emoji: e.target.value })}
                  placeholder="✅" style={{ ...input, width: 50, textAlign: 'center' }} />
                <input value={item.titulo || ''} onChange={e => setReceber(i, { titulo: e.target.value })}
                  placeholder="Título" style={{ ...input, flex: 1 }} />
                <button type="button" onClick={() => rmReceber(i)}
                  style={{ background: '#FEE2E2', border: 'none', color: '#DC2626', padding: '0 10px', borderRadius: 6, cursor: 'pointer' }}>×</button>
              </div>
              <textarea value={item.descricao || ''} onChange={e => setReceber(i, { descricao: e.target.value })}
                placeholder="Descrição" rows={2} style={textarea} />
            </div>
          ))}
          <button type="button" onClick={addReceber}
            style={{ fontSize: 12, color: '#3B82F6', background: 'none', border: '1px dashed #93C5FD', padding: '6px 12px', borderRadius: 6, cursor: 'pointer' }}>+ adicionar item</button>

          <Toggle label="Mostrar essa seção" valor={mostrarSecoes.receber !== false}
            onChange={v => setMostrar('receber', v)} />
        </div>
      </Secao>

      {/* GARANTIA */}
      <Secao titulo="🛡️ Garantia" aberta={!!garantia.titulo}>
        <div style={{ display: 'grid', gap: 8 }}>
          <Campo label="Título">
            <input value={garantia.titulo || ''} onChange={e => set({ garantia: { ...garantia, titulo: e.target.value } })}
              style={input} placeholder="Garantia incondicional de 7 dias" />
          </Campo>
          <Campo label="Texto">
            <textarea value={garantia.texto || ''} onChange={e => set({ garantia: { ...garantia, texto: e.target.value } })}
              rows={3} style={textarea} placeholder="Você tem 7 dias para testar..." />
          </Campo>
          <Toggle label="Mostrar essa seção" valor={mostrarSecoes.garantia !== false}
            onChange={v => setMostrar('garantia', v)} />
        </div>
      </Secao>

      {/* CORES CUSTOM */}
      <Secao titulo="🎨 Cores personalizadas" aberta={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Campo label="Cor antes (negativo)">
            <input type="color" value={config.cor_antes || '#DC2626'}
              onChange={e => set({ cor_antes: e.target.value })}
              style={{ width: '100%', height: 34, border: '1px solid #E5E7EB', borderRadius: 8 }} />
          </Campo>
          <Campo label="Cor depois (positivo)">
            <input type="color" value={config.cor_depois || '#16A34A'}
              onChange={e => set({ cor_depois: e.target.value })}
              style={{ width: '100%', height: 34, border: '1px solid #E5E7EB', borderRadius: 8 }} />
          </Campo>
          <Campo label="Cor do preço">
            <input type="color" value={config.cor_preco || '#0EA5E9'}
              onChange={e => set({ cor_preco: e.target.value })}
              style={{ width: '100%', height: 34, border: '1px solid #E5E7EB', borderRadius: 8 }} />
          </Campo>
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
          Se não configurar, usa a cor de destaque do tema.
        </div>
      </Secao>

      {/* HTML LIVRE */}
      <Secao titulo="🧩 HTML livre" aberta={!!config.html_livre}>
        <Campo label="HTML extra (aparece no fim da oferta)">
          <textarea value={config.html_livre || ''} onChange={e => set({ html_livre: e.target.value })}
            rows={4} style={{ ...textarea, fontFamily: 'monospace' }}
            placeholder="<div>...</div>" />
        </Campo>
      </Secao>

    </div>
  );
}

function Toggle({ label, valor, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', marginTop: 6 }}>
      <input type="checkbox" checked={valor} onChange={e => onChange(e.target.checked)} />
      {label}
    </label>
  );
}