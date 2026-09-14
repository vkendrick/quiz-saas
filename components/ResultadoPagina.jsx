'use client';

export default function ResultadoPagina({ quiz, score }) {
  const cfg = quiz.pagina_resultado || {};
  const faixas = cfg.faixas || [];
  const faixa = faixas.find(f => score >= (f.min ?? 0) && score <= (f.max ?? 9999))
    || faixas[faixas.length - 1];
  const tema = quiz.tema || {};
  const cor = tema.primary || '#6366F1';

  if (!faixa) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
        <div
          className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl"
          style={{ background: `${cor}15` }}
        >
          ✅
        </div>
        <h2 className="text-2xl font-bold mb-2">Obrigado!</h2>
        <p className="text-gray-600">Recebemos suas respostas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-8 shadow-lg">
        <div
          className="inline-block text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full mb-4"
          style={{ background: `${cor}15`, color: cor }}
        >
          Seu resultado
        </div>

        <h2 className="text-3xl font-bold mb-4 leading-tight" style={{ color: cor }}>
          {faixa.titulo}
        </h2>

        <p className="text-gray-600 text-base leading-relaxed whitespace-pre-line">
          {faixa.texto}
        </p>

        {faixa.imagem_url && (
          <img
            src={faixa.imagem_url}
            alt=""
            className="rounded-2xl mt-6 w-full shadow-sm"
          />
        )}
      </div>

      {faixa.cta_url && (
        <a
          href={faixa.cta_url}
          className="block w-full text-center py-4 rounded-2xl text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
          style={{ background: cor }}
        >
          {faixa.cta_texto || 'Continuar'}
        </a>
      )}
    </div>
  );
}