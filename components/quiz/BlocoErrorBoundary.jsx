'use client';
import { Component } from 'react';

export default class BlocoErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    console.error('Erro no bloco:', erro, info);
    // Chunk obsoleto (aba aberta durante um deploy): recarrega 1x sozinho.
    // Código novo não gera ChunkLoadError — sem risco de loop.
    const msg = String((erro && erro.message) || '') + ' ' + String((erro && erro.name) || '');
    if (/Loading chunk|ChunkLoadError|Loading CSS chunk/i.test(msg)) {
      try {
        const ts = +sessionStorage.getItem('prisma_chunk_reload_ts') || 0;
        if (Date.now() - ts > 10 * 60 * 1000) {
          sessionStorage.setItem('prisma_chunk_reload_ts', String(Date.now()));
          window.location.reload();
          return;
        }
      } catch {}
    }
  }

  ehChunk() {
    const msg = String((this.state.erro && this.state.erro.message) || '') + ' ' + String((this.state.erro && this.state.erro.name) || '');
    return /Loading chunk|ChunkLoadError|Loading CSS chunk/i.test(msg);
  }

  render() {
    if (this.state.erro) {
      if (this.ehChunk()) {
        return (
          <div style={{
            padding: 24,
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 12,
            color: '#92400E',
            fontSize: 14,
            textAlign: 'center'
          }}>
            <b>O quiz foi atualizado — recarregando…</b>
            <div style={{ marginTop: 12 }}>
              <button
                onClick={() => { try { sessionStorage.removeItem('prisma_chunk_reload_ts'); } catch {} window.location.reload(); }}
                style={{ background: '#1A7A5E', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Recarregar agora →
              </button>
            </div>
          </div>
        );
      }
      return (
        <div style={{
          padding: 20,
          background: '#FEF2F2',
          border: '1px solid #FECACA',
          borderRadius: 12,
          color: '#991B1B',
          fontSize: 13
        }}>
          <b>Esse bloco teve um erro:</b>
          <pre style={{ fontSize: 11, marginTop: 8, whiteSpace: 'pre-wrap' }}>
            {this.state.erro.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}