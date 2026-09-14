'use client';
import { useState } from 'react';
import Botao from '../ui/Botao';

export default function BlocoCaptura({ config = {}, tema = {}, onEnviar }) {
  const [form, setForm] = useState({ nome: '', email: '', telefone: '' });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  const campos = config.campos || ['nome', 'email', 'telefone'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    // Timeout de segurança — 10s
    const timeoutId = setTimeout(() => {
      setErro('Demorou demais pra responder. Tenta de novo em alguns segundos.');
      setEnviando(false);
    }, 10000);

    try {
      await onEnviar(form);
      clearTimeout(timeoutId);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Erro no envio:', err);
      setErro(err?.message || 'Erro ao enviar. Tenta de novo.');
      setEnviando(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: tema.inputPadding || '14px 18px',
    border: `2px solid ${tema.cardBorda || '#E5E7EB'}`,
    borderRadius: tema.inputRaio || 12,
    fontSize: 16,
    outline: 'none',
    background: tema.cardFundo || '#FFF',
    color: tema.texto || '#111',
    transition: 'border-color 0.2s',
    marginTop: 6,
    fontFamily: 'inherit'
  };

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: `${tema.ctaCor || tema.destaque}15`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, margin: '0 auto 16px'
        }}>
          🎉
        </div>
        <h2 style={{
          fontSize: 24, fontWeight: 800, color: tema.destaque, marginBottom: 8
        }}>
          {config.titulo || 'Tudo pronto!'}
        </h2>
        <p style={{ fontSize: 15, color: tema.textoSuave }}>
          {config.subtitulo || 'Deixe seus dados para ver o resultado.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {campos.includes('nome') && (
          <label style={{ fontSize: 14, fontWeight: 500, color: tema.texto }}>
            Seu nome
            <input
              required
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Como podemos te chamar?"
              style={inputStyle}
              disabled={enviando}
            />
          </label>
        )}

        {campos.includes('email') && (
          <label style={{ fontSize: 14, fontWeight: 500, color: tema.texto }}>
            E-mail
            <input
              required
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="seu@email.com"
              style={inputStyle}
              disabled={enviando}
            />
          </label>
        )}

        {campos.includes('telefone') && (
          <label style={{ fontSize: 14, fontWeight: 500, color: tema.texto }}>
            WhatsApp <span style={{ color: tema.textoSuave, fontWeight: 400 }}>(opcional)</span>
            <input
              value={form.telefone}
              onChange={e => setForm({ ...form, telefone: e.target.value })}
              placeholder="(11) 99999-9999"
              style={inputStyle}
              disabled={enviando}
            />
          </label>
        )}

        {erro && (
          <div style={{
            padding: 12,
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            borderRadius: 8,
            fontSize: 13,
            lineHeight: 1.5
          }}>
            ⚠️ {erro}
          </div>
        )}

        <Botao type="submit" disabled={enviando} tema={tema}>
          {enviando ? 'Enviando...' : (config.cta || 'Ver meu resultado →')}
        </Botao>

        <p style={{
          fontSize: 12, color: tema.textoRodape,
          textAlign: 'center', marginTop: 4
        }}>
          🔒 Seus dados estão seguros.
        </p>
      </form>

      {config.html_livre && (
        <div
          style={{ marginTop: 20 }}
          dangerouslySetInnerHTML={{ __html: config.html_livre }}
        />
      )}
    </div>
  );
}