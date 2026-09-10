'use client';
export default function ResultadoPagina({ quiz, score }) {
  const cfg = quiz.pagina_resultado || {};
  const faixas = cfg.faixas || [];
  const faixa = faixas.find(f => score >= (f.min ?? 0) && score <= (f.max ?? 9999)) || faixas[faixas.length - 1];
  const tema = quiz.tema || {};

  if (!faixa) {
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-bold mb-2">Obrigado! 🎉</h2>
        <p className="text-gray-600">Recebemos suas respostas.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-8 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-gray-400 mb-2">Seu resultado</div>
      <h2 className="text-2xl font-bold mb-3" style={{ color: tema.primary || '#3B82F6' }}>{faixa.titulo}</h2>
      <p className="text-gray-600 mb-6 whitespace-pre-line">{faixa.texto}</p>
      {faixa.imagem_url && <img src={faixa.imagem_url} alt="" className="rounded-lg mb-6 w-full" />}
      {faixa.cta_url && (
        <a href={faixa.cta_url} className="inline-block w-full text-center py-3 rounded-lg text-white font-medium"
          style={{ background: tema.primary || '#3B82F6' }}>{faixa.cta_texto || 'Continuar'}</a>
      )}
    </div>
  );
}
