'use client';

export default function TextoRico({ texto, tema, as: Tag = 'p', style = {} }) {
  if (!texto) return null;

  const cor = tema?.ctaCor || tema?.destaque || '#0EA5E9';

  let html = String(texto);

  // Escapa HTML básico
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Links [texto](url)
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" target="_self" rel="noopener" style="color:${cor};text-decoration:underline;">$1</a>`
  );

  // Negrito
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Itálico
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Destaque colorido (==texto==)
  html = html.replace(
    /==([^=]+)==/g,
    `<span style="color:${cor};font-weight:700;">$1</span>`
  );

  // Atenção (fundo amarelo)
  html = html.replace(
    /__([^_]+)__/g,
    `<span style="background:#FEF3C7;color:#92400E;padding:2px 8px;border-radius:6px;font-weight:600;">$1</span>`
  );

  // 🔽 Quebras de linha — trata os 2 casos (literal e newline real)
  html = html.replace(/\\n\\n/g, '<br /><br />');   // literal "\n\n" (2 chars)
  html = html.replace(/\\n/g, '<br />');           // literal "\n"
  html = html.replace(/\n\n+/g, '<br /><br />');   // newline real duplo
  html = html.replace(/\n/g, '<br />');            // newline real simples

  return (
    <Tag
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}