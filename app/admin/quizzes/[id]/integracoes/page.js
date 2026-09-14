'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase-browser';
import { atualizarQuiz } from '@/lib/quiz2';

const PIXELS = [
  { key: 'meta_pixel', label: 'Meta Pixel ID' },
  { key: 'ga4', label: 'GA4 — Measurement ID (G-XXXX)' },
  { key: 'gtm', label: 'Google Tag Manager (GTM-XXXX)' },
  { key: 'google_ads', label: 'Google Ads (AW-XXXX)' },
  { key: 'tiktok_pixel', label: 'TikTok Pixel' },
  { key: 'clarity', label: 'Microsoft Clarity ID' }
];

const CHECKOUTS = [
  { id: '',              nome: 'Não configurado' },
  { id: 'hotmart',       nome: 'Hotmart' },
  { id: 'kiwify',        nome: 'Kiwify' },
  { id: 'perfectpay',    nome: 'Perfect Pay' },
  { id: 'braip',         nome: 'Braip' },
  { id: 'ticto',         nome: 'Ticto' },
  { id: 'cakto',         nome: 'Cakto' },
  { id: 'outro',         nome: 'Outro (genérico)' }
];

export default function IntegracoesPage() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [cfg, setCfg] = useState({});
  const [checkout, setCheckout] = useState({ tipo: '', secret: '' });
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    supabase.from('quizzes').select('*').eq('id', id).single()
      .then(({ data }) => {
        setQuiz(data);
        setCfg(data.integracoes || {});
        setCheckout({
          tipo: data.checkout_tipo || '',
          secret: data.checkout_webhook_secret || ''
        });
      });
  }, [id]);

  if (!quiz) return <div style={{ padding: 40 }}>Carregando…</div>;

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook/compra?quiz_id=${quiz.id}&secret=${checkout.secret || 'SEU_SECRET'}`
    : '';

  const copiar = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const gerarSecret = () => {
    const s = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    setCheckout({ ...checkout, secret: s });
  };

  const salvar = async () => {
    setSalvando(true);
    await atualizarQuiz(quiz.id, {
      integracoes: cfg,
      checkout_tipo: checkout.tipo || null,
      checkout_webhook_secret: checkout.secret || null
    });
    setSalvando(false);
    alert('Salvo!');
  };

  return (
    <div style={{ maxWidth: 700 }}>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={`/admin/quizzes/${id}`} style={{ color: '#6B7280', fontSize: 13 }}>← Voltar</Link>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>🔌 Integrações</h1>
      </div>

      {/* SEÇÃO: PIXELS */}
      <section style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>📊 Pixels e Analytics</h2>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
          Cole apenas os IDs. Scripts são injetados automaticamente quando o quiz carrega.
        </p>

        {PIXELS.map(c => (
          <label key={c.key} style={{ display: 'block', marginBottom: 14, fontSize: 13 }}>
            {c.label}
            <input
              value={cfg[c.key] || ''}
              onChange={e => setCfg({ ...cfg, [c.key]: e.target.value })}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, marginTop: 4 }}
            />
          </label>
        ))}

        <label style={{ display: 'block', marginBottom: 14, fontSize: 13 }}>
          Custom head (HTML livre)
          <textarea
            rows={3}
            value={cfg.custom_head || ''}
            onChange={e => setCfg({ ...cfg, custom_head: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, fontFamily: 'monospace', marginTop: 4 }}
          />
        </label>
      </section>

      {/* SEÇÃO: CHECKOUT / WEBHOOK */}
      <section style={{ background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>💰 Checkout / Webhook de Compra</h2>
        <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
          Quando alguém comprar, o checkout envia um webhook aqui e o lead passa automaticamente pra <b>&quot;Comprou&quot;</b>.
        </p>

        <label style={{ display: 'block', marginBottom: 14, fontSize: 13 }}>
          Plataforma de checkout
          <select
            value={checkout.tipo}
            onChange={e => setCheckout({ ...checkout, tipo: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, marginTop: 4 }}
          >
            {CHECKOUTS.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </label>

        <label style={{ display: 'block', marginBottom: 14, fontSize: 13 }}>
          Secret do webhook
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              value={checkout.secret}
              onChange={e => setCheckout({ ...checkout, secret: e.target.value })}
              placeholder="Clique em gerar ou cole o seu"
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13 }}
            />
            <button
              type="button"
              onClick={gerarSecret}
              style={{
                padding: '8px 14px', background: '#F3F4F6', border: 'none',
                borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              🎲 Gerar
            </button>
          </div>
        </label>

        {checkout.secret && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
              URL do webhook (cole no painel da sua plataforma)
            </div>
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              padding: '8px 12px'
            }}>
              <code style={{
                flex: 1,
                fontSize: 11,
                color: '#374151',
                wordBreak: 'break-all',
                fontFamily: 'monospace'
              }}>
                {webhookUrl}
              </code>
              <button
                type="button"
                onClick={copiar}
                style={{
                  padding: '6px 12px',
                  background: copiado ? '#10B981' : '#3B82F6',
                  color: '#FFF',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {copiado ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>
              Cole essa URL no painel da plataforma pra ela avisar quando alguém comprar.
            </div>
          </div>
        )}
      </section>

      <button
        onClick={salvar}
        disabled={salvando}
        style={{
          padding: '10px 24px',
          background: salvando ? '#93C5FD' : '#3B82F6',
          color: '#FFF',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          cursor: salvando ? 'wait' : 'pointer'
        }}
      >
        {salvando ? 'Salvando…' : '💾 Salvar integrações'}
      </button>
    </div>
  );
}