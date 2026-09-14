'use client';


const TIPOS = [
  { id: 'intro',                 nome: 'Intro',                 emoji: '🎬', desc: 'Tela inicial com headline' },
  { id: 'pergunta',              nome: 'Pergunta',              emoji: '❓', desc: 'Uma pergunta com opções' },
  { id: 'conteudo',              nome: 'Conteúdo',              emoji: '📄', desc: 'Título + texto + imagem' },
  { id: 'prova_social',          nome: 'Prova social',          emoji: '⭐', desc: 'Testemunhos + avaliação' },
  { id: 'loading',               nome: 'Loading',               emoji: '⏳', desc: 'Barra de progresso animada' },
  { id: 'captura',               nome: 'Captura (Lead)',        emoji: '📝', desc: 'Nome / e-mail / WhatsApp' },
  { id: 'resultado',             nome: 'Resultado',             emoji: '🎯', desc: 'Faixas por score + CTA' },
  { id: 'html',                  nome: 'HTML livre',            emoji: '🧩', desc: 'Cole HTML puro (VSL, countdown…)' },
  { id: 'antes_depois',          nome: 'Antes / Depois',        emoji: '🖼️', desc: 'Duas imagens lado a lado' },
  { id: 'grafico',               nome: 'Gráfico',               emoji: '📊', desc: 'Evolução atual vs ideal' },
  { id: 'oferta',                nome: 'Oferta',                emoji: '💰', desc: 'Preço + CTA + countdown' },
  { id: 'relatorio_diagnostico', nome: 'Relatório diagnóstico', emoji: '📊', desc: 'Barras + curva + veredito por categoria' }  // ← NOVA LINHA
];

export default function ModalAdicionarBloco({ aberto, onFechar, onEscolher }) {
  if (!aberto) return null;

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 16
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#FFF', borderRadius: 16, padding: 24,
          maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
            Adicionar bloco
          </h2>
          <button type="button" onClick={onFechar}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#9CA3AF' }}>×</button>
        </div>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>
          Clique pra adicionar no fim, ou <b>arraste</b> direto pra posição desejada.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 12
        }}>
          {TIPOS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => onEscolher(t.id)}
              draggable
              onDragStart={e => {
                e.dataTransfer.setData('bloco-tipo', t.id);
                e.dataTransfer.effectAllowed = 'copy';
              }}
              style={{
                textAlign: 'left',
                padding: 16,
                border: '1px solid #E5E7EB',
                borderRadius: 12,
                background: '#FFF',
                cursor: 'grab',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#3B82F6';
                e.currentTarget.style.background = '#EFF6FF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#E5E7EB';
                e.currentTarget.style.background = '#FFF';
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{t.emoji}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                {t.nome}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}