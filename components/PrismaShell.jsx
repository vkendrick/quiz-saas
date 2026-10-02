'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { lerOculto, gravarOculto } from './prisma/Oculto';
import { VERSAO } from '@/lib/versao';

// Shell único do vendedor: topbar + menu lateral + navegação mobile.
// Usado em /admin/* (via app/admin/layout) e /{tenant}/gestao/* (via layout próprio).
// Páginas NÃO devem ter topo/nav próprios — só conteúdo.
const CSS = `
.pshell{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif}
.ptop{position:sticky;top:0;z-index:50;display:flex;gap:12px;align-items:center;padding:10px 20px;background:#0E1420;border-bottom:1px solid #232B3B}
.plogo{font-weight:800;color:#fff;text-decoration:none;font-size:15px;white-space:nowrap}
.penv{display:flex;align-items:center;gap:8px;font-size:13px;color:#9AA4B5}
.penv select{background:#151A24;border:1px solid #232B3B;color:#E8ECF3;border-radius:8px;padding:6px 10px;font-size:13px;max-width:220px}
.penv .fix{color:#E8ECF3}
.ptop .sp{margin-left:auto;display:flex;gap:12px;align-items:center;font-size:13px}
.ptop .mail{color:#9AA4B5;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sair{background:none;border:none;color:#E05D5D;cursor:pointer;font-size:13px}
.pbody{display:flex;align-items:stretch;min-height:calc(100vh - 49px)}
.pside{width:220px;flex-shrink:0;border-right:1px solid #232B3B;padding:18px 12px;display:flex;flex-direction:column;gap:2px}
.pgrupo{font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#5b6577;margin:14px 8px 6px}
.pgrupo:first-child{margin-top:0}
.pitem{display:block;color:#9AA4B5;text-decoration:none;font-size:14px;border-radius:10px;padding:9px 12px}
.pitem:hover{background:#151A24;color:#fff}
.pitem.on{background:#151A24;color:#fff;border:1px solid #2EAA84}
.pmain{flex:1;min-width:0}
.mobnav{display:none;gap:8px;overflow-x:auto;padding:10px 16px;border-bottom:1px solid #232B3B;background:#0E1420}
.mobnav a{flex-shrink:0;color:#9AA4B5;text-decoration:none;font-size:13px;border:1px solid #232B3B;border-radius:20px;padding:6px 14px}
.mobnav a.on{color:#fff;border-color:#2EAA84}
@media(max-width:900px){.pside{display:none}.mobnav{display:flex}}
`;

export function lerTenant() {
  try { return localStorage.getItem('prisma_tenant') || ''; } catch { return ''; }
}

export function gravarTenant(t) {
  try {
    localStorage.setItem('prisma_tenant', t);
    window.dispatchEvent(new CustomEvent('prisma-tenant', { detail: t }));
  } catch {}
}

export default function PrismaShell({ tenant, tenants, email, onTrocar, onSair, children }) {
  const pathname = usePathname() || '';
  const [tLocal, setTLocal] = useState(tenant || '');
  const [naoLidas, setNaoLidas] = useState(0);
  const [trialDias, setTrialDias] = useState(null);
  const [priv, setPriv] = useState(false);
  useEffect(() => {
    setPriv(lerOculto());
    const fn = (e) => setPriv(!!e?.detail);
    window.addEventListener('prisma-priv', fn);
    return () => window.removeEventListener('prisma-priv', fn);
  }, []);
  useEffect(() => { if (tenant) setTLocal(tenant); }, [tenant]);
  useEffect(() => {
    const t = tenant || tLocal;
    if (!t) return;
    fetch(`/api/prisma/admin/notifications?tenant=${t}`).then(r => r.json())
      .then(j => { if (j.ok) setNaoLidas(j.total_nao_lidas || 0); }).catch(() => {});
    fetch(`/api/prisma/admin/conta?tenant=${t}`).then(r => r.json())
      .then(j => {
        if (j.ok && j.plan === 'free' && j.trial_ends_at) {
          const ms = new Date(j.trial_ends_at) - new Date();
          setTrialDias(ms > 0 ? Math.ceil(ms / 86400e3) : 0);
        } else setTrialDias(null);
      }).catch(() => {});
  }, [tenant, tLocal, pathname]);
  const t = tenant || tLocal;

  const trocar = (novo) => {
    setTLocal(novo);
    gravarTenant(novo);
    if (onTrocar) onTrocar(novo);
  };

  const grupos = [
    ['Vender', [
      t ? ['🏠 Início', `/${t}`] : null,
      ['🎯 Ofertas', '/admin/prisma/produtos'],
      ['🧩 Páginas', '/admin/prisma/paginas'],
      ['❓ Quiz', '/admin/quizzes'],
    ]],
    ['Entregar', [
      t ? ['🎓 Área de membros', `/${t}/gestao/area`] : null,
    ].filter(Boolean)],
    ['Medir', [
      t ? ['📊 Resumo', `/${t}/gestao`] : null,
      t ? ['💰 Vendas', `/${t}/gestao/vendas`] : null,
      t ? ['📣 Campanhas', `/${t}/gestao/campanhas`] : null,
      t ? ['💬 Conversas', `/${t}/gestao/conversas`] : null,
      t ? [`🔔 Notificações${naoLidas ? ` (${naoLidas})` : ''}`, `/${t}/gestao/notificacoes`] : null,
    ].filter(Boolean)],
    ['Setups', [
      t ? ['🤖 Automações', `/${t}/gestao/automacoes`] : null,
      t ? ['💬 Agente WhatsApp', `/${t}/gestao/agente`] : null,
      t ? ['🔌 Integrações', `/${t}/gestao/integracoes`] : null,
      t ? ['🧾 Taxas', `/${t}/gestao/taxas`] : null,
    ].filter(Boolean)],
    ['', [
      t ? ['🧲 Eventos', `/${t}/gestao/eventos`] : null,
      t ? ['🏷️ UTMs', `/${t}/gestao/utms`] : null,
      t ? ['⚙️ Conta', `/${t}/gestao/conta`] : null,
      (tenants || []).some(x => x.slug === 'PRISMA') ? ['🏦 Financeiro', '/admin/prisma/financeiro'] : null,
      (tenants || []).some(x => x.slug === 'PRISMA') ? ['🏛️ Sistema', '/admin/prisma/sistema'] : null,
    ].filter(Boolean)],
  ];
  const todos = grupos.flatMap(([, itens]) => itens);
  // Só o item mais específico acende (ex: em /loja/gestao/vendas, só Vendas).
  const hrefAtivo = todos
    .map(([, h]) => h)
    .filter((h) => pathname === h || pathname.startsWith(h + '/'))
    .sort((a, b) => b.length - a.length)[0] || null;
  const ativo = (h) => h === hrefAtivo;

  return (
    <div className="pshell"><style>{CSS}</style>
      <div className="ptop">
        <Link href={t ? `/${t}` : '/entrar'} className="plogo">P Prisma · Painel</Link>
        <span className="penv">Ambiente:
          {(tenants || []).length <= 1
            ? <b className="fix">{(tenants || [])[0]?.name || (tenants || [])[0]?.slug || t || '…'}</b>
            : <select value={t} onChange={e => trocar(e.target.value)}>
                {(tenants || []).map(x => <option key={x.slug} value={x.slug}>{x.name || x.slug}</option>)}
              </select>}
        </span>
        <span className="sp">
          {trialDias != null && trialDias > 0 && (
            <span title="Período de testes" style={{ background: '#0e2a20', border: '1px solid #2EAA84', color: '#2EAA84', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
              ⏳ Teste · {trialDias}d
            </span>
          )}
          <span className="mail">{email}</span>
          <button className="sair" style={{ color: '#9AA4B5' }} title={priv ? 'Mostrar nomes' : 'Ocultar nomes (privacidade)'}
            onClick={() => { gravarOculto(!priv); setPriv(!priv); }}>{priv ? '🙈' : '👁'}</button>
          {onSair && <button className="sair" onClick={onSair}>Sair</button>}
        </span>
      </div>
      <div className="mobnav">
        {todos.map(([l, h]) => <Link key={h + l} href={h} className={ativo(h) ? 'on' : ''}>{l}</Link>)}
      </div>
      <div className="pbody">
        <aside className="pside">
          {grupos.map(([g, itens]) => (
            <div key={g}>
              {g ? <div className="pgrupo">{g}</div> : null}
              {itens.map(([l, h]) => <Link key={h + l} href={h} className={'pitem' + (ativo(h) ? ' on' : '')}>{l}</Link>)}
            </div>
          ))}
          <div style={{ marginTop: 'auto', padding: '12px 8px 0', fontSize: 10, color: '#3d4657' }}>v{VERSAO}</div>
        </aside>
        <main className="pmain">{children}</main>
      </div>
    </div>
  );
}
