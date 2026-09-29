'use client';
import { useState } from 'react';
import { uploadMedia } from '@/lib/quiz2';

export default function SeletorImagem({ valor, onChange, pasta = 'quiz' }) {
  const [url, setUrl] = useState(valor || '');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [tamanhoOriginal, setTamanhoOriginal] = useState(null);
  const [tamanhoComprimido, setTamanhoComprimido] = useState(null);

  const aplicar = () => onChange(url.trim());

  // 🔽 Redimensiona e comprime a imagem no cliente
  const processarImagem = (file) => {
    return new Promise((resolve, reject) => {
      const MAX_LARGURA = 1200;
      const MAX_ALTURA = 1200;
      const QUALIDADE = 0.82;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Calcula novas dimensões mantendo proporção
          if (width > MAX_LARGURA || height > MAX_ALTURA) {
            const ratio = Math.min(MAX_LARGURA / width, MAX_ALTURA / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Desenha em canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Converte pra WebP
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha ao comprimir imagem'));
                return;
              }
              resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
                type: 'image/webp'
              }));
            },
            'image/webp',
            QUALIDADE
          );
        };
        img.onerror = () => reject(new Error('Imagem inválida'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  };

  const upload = async (file) => {
    setErro(null);
    setEnviando(true);

    try {
      // 🔽 Valida tamanho original (avisa se for gigante)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('Imagem maior que 10 MB. Reduza antes de subir.');
      }

      setTamanhoOriginal(file.size);

      // 🔽 Comprime + redimensiona
      const otimizada = await processarImagem(file);
      setTamanhoComprimido(otimizada.size);

      // 🔽 Upload
      const publicUrl = await uploadMedia(otimizada, pasta);
      setUrl(publicUrl);
      onChange(publicUrl);
    } catch (e) {
      setErro(e.message || 'Erro ao enviar');
    } finally {
      setEnviando(false);
    }
  };

  const kb = (bytes) => (bytes / 1024).toFixed(0) + ' KB';

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
          {enviando ? 'Otimizando...' : '📁 Upload'}
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

      {tamanhoOriginal && tamanhoComprimido && (
        <div style={{
          fontSize: 11, color: '#059669',
          background: '#F0FDF4', padding: '4px 10px',
          borderRadius: 6, marginBottom: 8
        }}>
          ✅ Otimizado: {kb(tamanhoOriginal)} → {kb(tamanhoComprimido)}
          ({Math.round((1 - tamanhoComprimido / tamanhoOriginal) * 100)}% menor)
        </div>
      )}
      <p style={{ fontSize: 11, color: '#9CA3AF', margin: '0 0 8px' }}>
        Ideal: PNG sem fundo, 800px+. JPG cria quadrado branco no fundo verde.
      </p>

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
            onClick={() => { setUrl(''); onChange(''); setTamanhoOriginal(null); setTamanhoComprimido(null); }}
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