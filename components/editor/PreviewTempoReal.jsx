'use client';
import { useState, useEffect, useRef } from 'react';

export default function PreviewTempoReal({ slug, versao }) {
  const [key, setKey] = useState(0);
  const [dispositivo, setDispositivo] = useState('mobile');

  // Recarrega iframe quando algo muda no editor
  useEffect(() => {
    setKey(k => k + 1);
  }, [versao]);

  const largura = dispositivo === 'mobile' ? 390 : 1024;
  const altura = dispositivo === 'mobile' ? 720 : 700;

  return (
    <div style={{
      background: '#F3F4F6',
      borderRadius: 12,
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      height: '100%'
    }}>
      {/* Controles */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: '#FFF',
        borderRadius: 8,
        padding: 4,
        width: 'fit-content',
        alignSelf: 'center'
      }}>
        <button
          type="button"
          onClick={() => setDispositivo('mobile')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            background: dispositivo === 'mobile' ? '#111827' : 'transparent',
            color: dispositivo === 'mobile' ? '#FFF' : '#374151'
          }}
        >📱 Mobile</button>
        <button
          type="button"
          onClick={() => setDispositivo('desktop')}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            background: dispositivo === 'desktop' ? '#111827' : 'transparent',
            color: dispositivo === 'desktop' ? '#FFF' : '#374151'
          }}
        >💻 Desktop</button>
        <button
          type="button"
          onClick={() => setKey(k => k + 1)}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            fontSize: 12,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#374151'
          }}
        >🔄</button>
      </div>

      {/* Iframe */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
        <iframe
          key={key}
          src={`/quiz/${slug}?preview=1`}
          style={{
            width: largura,
            maxWidth: '100%',
            height: altura,
            border: '1px solid #E5E7EB',
            borderRadius: 12,
            background: '#FFF'
          }}
        />
      </div>
    </div>
  );
}