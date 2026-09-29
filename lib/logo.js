// STAGE → quiz-saas/lib/logo.js (ARQUIVO NOVO, client)
// Validação de logo no upload: tamanho mínimo + alerta de fundo.
// Uso: área (tema) e editores. Não bloqueia — orienta.
'use client';

export function validarLogo(file) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) {
      resolve({ ok: false, erro: 'Arquivo inválido. Envie PNG ou WEBP.' });
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const avisos = [];
      if (img.width < 400) {
        avisos.push(`Imagem pequena (${img.width}px). Ideal: 800px ou mais.`);
      }
      if (file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name || '')) {
        avisos.push('JPG não tem transparência: no fundo verde aparece um quadrado branco. Prefira PNG sem fundo.');
      }
      resolve({ ok: true, largura: img.width, altura: img.height, avisos });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, erro: 'Não consegui ler a imagem.' });
    };
    img.src = url;
  });
}
