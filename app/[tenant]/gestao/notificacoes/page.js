// STAGE → quiz-saas/app/[tenant]/gestao/notificacoes/page.js (ARQUIVO NOVO)
// Central: vendas aprovadas, reembolsos, chargebacks e avisos. Toque p/ marcar lida.
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:28px 20px 60px}
.wrap{max-width:1400px;margin:0 auto}
h1{font-size:24px;margin-bottom:4px}
.topbar{position:sticky;top:49px;z-index:40;background:#0B0E14;padding:12px 0;display:flex;gap:10px;align-items:center;margin-bottom:4px;flex-wrap:wrap}
.topbar h1{font-size:26px;margin:0;margin-right:auto}
.sech{font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:24px 0 10px}
.sub{color:#9AA4B5;font-size:13px;margin-bottom:16px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:16px 18px;margin-bottom:10px;cursor:pointer}
.card.lida{opacity:.55}
.linha{background:#151A24;border:1px solid #232B3B;border-radius:12px;padding:10px 14px;margin-bottom:8px;cursor:pointer;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
.linha.lida{opacity:.55}
.linha .tt{font-size:14px;font-weight:700;color:#fff;white-space:nowrap}
.linha .cc{color:#C2CAD6;font-size:13px;flex:1;min-width:180px;overflow:hidden;text-overflow:ellipsis}
.linha .qq{color:#8A93A3;font-size:11px;white-space:nowrap;margin-left:auto}
.tag{display:inline-block;font-size:10px;font-weight:800;letter-spacing:1px;text-transform:uppercase;border-radius:12px;padding:2px 10px}
.tag.push{background:#0e2a20;color:#2EAA84}
.tag.relatorio{background:#1a2340;color:#4D8DFF}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:14px}
.mut{color:#9AA4B5;font-size:13px}
`;

function quando(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

export default function Notificacoes() {
  const { tenant } = useParams();
  const [items, setItems] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [push, setPush] = useState('verificando'); // verificando|ativo|inativo|erro
  const [filtro, setFiltro] = useState('hoje'); // hoje|ontem|7d (teto: 7 dias)
  const dia = (iso) => String(iso || '').slice(0, 10);
  const hojeISO = new Date().toISOString().slice(0, 10);
  const ontemISO = new Date(Date.now() - 86400e3).toISOString().slice(0, 10);
  const visiveis = items.filter((n) => {
    const d = dia(n.criado_em);
    if (filtro === 'hoje') return d === hojeISO;
    if (filtro === 'ontem') return d === ontemISO;
    if (filtro === '7d') return d >= new Date(Date.now() - 7 * 86400e3).toISOString().slice(0, 10);
    return true;
  });

  const carregar = async () => {
    const r = await fetch(`/api/prisma/admin/notifications?tenant=${tenant}`).then(r => r.json()).catch(() => ({}));
    if (r.ok) { setItems(r.items || []); setNaoLidas(r.total_nao_lidas || 0); }
  };
  useEffect(() => { carregar(); }, [tenant]);

  useEffect(() => {
    (async () => {
      try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) { setPush('erro'); return; }
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        setPush(sub ? 'ativo' : 'inativo');
      } catch { setPush('erro'); }
    })();
  }, []);

  const ativarPush = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw-push.js');
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPush('erro'); return; }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC,
      });
      const r = await fetch('/api/prisma/admin/push', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant, subscription: sub.toJSON() }),
      }).then(r => r.json()).catch(() => ({}));
      setPush(r.ok ? 'ativo' : 'erro');
    } catch { setPush('erro'); }
  };

  const ler = async (id) => {
    setItems(items.map(n => n.id === id ? { ...n, lida: true } : n));
    setNaoLidas(Math.max(0, naoLidas - 1));
    await fetch('/api/prisma/admin/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant, id }),
    }).catch(() => {});
  };

  const lerTodas = async () => {
    setItems(items.map(n => ({ ...n, lida: true })));
    setNaoLidas(0);
    await fetch('/api/prisma/admin/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant }),
    }).catch(() => {});
    carregar();
  };

  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <div className="topbar">
          <h1>🔔 Notificações {naoLidas > 0 && `(${naoLidas})`}</h1>
        </div>
        <p className="sub">Vendas, reembolsos e avisos do seu painel.</p>
        <div className="row" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
          {push === 'inativo' && <button className="btn" onClick={ativarPush}>Ativar push neste aparelho</button>}
          {push === 'ativo' && <p className="sub" style={{ margin: 0 }}>✅ Push ativo neste aparelho.</p>}
          {naoLidas > 0 && <button className="btn" onClick={lerTodas}>Marcar todas como lidas</button>}
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
          {[['hoje', 'Hoje'], ['ontem', 'Ontem'], ['7d', '7 dias']].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ background: filtro === k ? '#2EAA84' : 'transparent', border: '1px solid #232B3B', color: filtro === k ? '#fff' : '#9AA4B5', borderRadius: 10, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
              {l}
            </button>
          ))}
        </div>
        {!visiveis.length && <p className="mut">Nada por aqui ainda. Vendas aprovadas aparecem aqui sozinhas.</p>}
        {visiveis.map(n => (
          <div key={n.id} className={'linha' + (n.lida ? ' lida' : '')} onClick={() => !n.lida && ler(n.id)}>
            <span className={`tag ${n.canal === 'relatorio' ? 'relatorio' : 'push'}`}>
              {n.canal === 'relatorio' ? 'relatório' : 'venda'}
            </span>
            <span className="tt">{n.titulo}</span>
            {n.corpo && <span className="cc">{n.corpo}</span>}
            <span className="qq">{quando(n.criado_em)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
