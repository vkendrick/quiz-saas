'use client';
import { useState } from 'react';
import { uploadMedia } from '@/lib/quiz2';

export default function SeletorImagem({ valor, onChange, pasta = 'quiz' }) {
  const [url, setUrl] = useState(valor || '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const aplicar = () => onChange(url.trim());

  const upload = async (file) => {
    setErro(null);
    setEnviando(true);
    try {
      const publicUrl = await uploadMedia(file, pasta);
      setUrl(publicUrl);
      onChange(publicUrl);
    } catch (e) {
      setErro(e.message || 'Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          value={url}
          onChange={e => setUrl(e.target.value)}
          onBlur={aplicar}
          placeholder="Cole a URL da imagem ou faça upload →"
          style={{
            flex: 1,
            padding: '8px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 13,
            outline: 'none'
          }}
        />
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          background: '#111827',
          color: '#FFF',
          borderRadius: 8,
          fontSize: 13,
          cursor: enviando ? 'wait' : 'pointer',
          fontWeight: 500
        }}>
          {enviando ? 'Enviando…' : '📁 Upload'}
          <input
            type="file"
            accept="image/*"
            onChange={e => e.target.files?.[0] && upload(e.target.files[0])}
            style={{ display: 'none' }}
            disabled={enviando}
          />
        </label>
      </div>

      {erro && (
        <div style={{
          fontSize: 12, color: '#DC2626',
          background: '#FEF2F2', padding: '6px 10px',
          borderRadius: 6, marginBottom: 8
        }}>{erro}</div>
      )}

      {url && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={url}
            alt=""
            style={{
              maxHeight: 120, borderRadius: 10,
              border: '1px solid #E5E7EB', display: 'block'
            }}
          />
          <button
            type="button"
            onClick={() => { setUrl(''); onChange(''); }}
            style={{
              position: 'absolute', top: -8, right: -8,
              width: 24, height: 24, borderRadius: '50%',
              background: '#DC2626', color: '#FFF',
              border: '2px solid #FFF', fontSize: 14,
              cursor: 'pointer', lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}