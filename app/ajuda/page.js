// STAGE → quiz-saas/app/ajuda/page.js (ARQUIVO NOVO)
// Área educativa: como usar/configurar, dados pendentes, onde pegar cada chave.
'use client';
import { useState } from 'react';

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{min-height:100vh;background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif;padding:32px 20px 60px}
.wrap{max-width:820px;margin:0 auto}
h1{font-size:28px;margin-bottom:6px}
.sub{color:#9AA4B5;margin-bottom:24px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:14px;padding:20px;margin-bottom:14px}
.card h3{font-size:16px;margin-bottom:8px}
p,li{font-size:14px;color:#9AA4B5;line-height:1.65}
ol,ul{margin:8px 0 8px 20px}
code{background:#0E1420;border:1px solid #232B3B;border-radius:6px;padding:1px 7px;font-size:12px;color:#2EAA84}
input{background:#0E1420;border:1px solid #232B3B;border-radius:10px;padding:10px;color:#E8ECF3;font-size:14px;width:100%}
.btn{background:#2EAA84;color:#fff;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;margin-top:8px}
.ok{color:#2EAA84}.no{color:#F5A623}
.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
`;

const GUIAS = [
  ['Começando: checklist de ativação',
    '1. Cadastre 1 produto (Admin → Produtos). 2. Cole o link do checkout + secret (aba Checkout). 3. Publique 1 página (Páginas → editor → Publicar). 4. Faça uma venda teste (?test=1 no webhook). 5. Configure taxas (Gestão → Taxas) para ver o lucro real.'],
  ['Onde pego o link e o secret do checkout?',
    'Kiwify/Hotmart/Stripe: no painel da plataforma, na configuração do produto (webhook/API). Cole a URL em Produtos → aba Checkout e o secret no campo webhook. Sem o secret, a venda não libera acesso.'],
  ['Onde pego o token da Meta (ads_read)?',
    'business.facebook.com → Configurações → Usuários do sistema → crie um → adicione a conta de anúncios (somente leitura) → Gerar token com escopo ads_read. Cole em Gestão → Integrações. Guia completo em docs/05.'],
  ['Como o comprador entra na área?',
    '3 caminhos: botão "Entrar direto" na página de obrigado (2h, 1 uso); magic link por email (precisa da chave Resend); ou link manual gerado por você.'],
  ['Como pauso campanhas sozinho?',
    'Gestão → Automações → Nova regra: nível CONJUNTO, métrica CPA, condição, limite, horário e produto. Comece em "aprovar". Ações reais exigem ads_management (revisão do app).'],
  ['Meus números sumiram / zeraram',
    'Confira: período selecionado, conta de anúncios, se o sync rodou (Integrações → last sync) e se as campanhas estão marcadas para acompanhar (tracked).'],
];

export default function Ajuda() {
  const [tenant, setTenant] = useState('');
  const [ck, setCk] = useState(null);
  const ver = async () => {
    if (!tenant) return;
    const r = await fetch(`/api/prisma/admin/checklist?tenant=${tenant}`).then(r => r.json()).catch(() => ({}));
    setCk(r.ok ? r : { erro: 'Sem sessão de operador para este tenant. Entre em /' + tenant + '/login.' });
  };
  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="wrap">
        <h1>Ajuda Prisma</h1>
        <p className="sub">Como usar, configurar e onde pegar cada dado.</p>
        <div className="card">
          <h3>Dados pendentes do meu tenant</h3>
          <div className="row">
            <input style={{ flex: 1 }} value={tenant} onChange={e => setTenant(e.target.value)} placeholder="apelido do tenant (ex: PRISMA)" />
            <button className="btn" onClick={ver}>Ver checklist</button>
          </div>
          {ck && (ck.erro
            ? <p style={{ marginTop: 10 }}>{ck.erro}</p>
            : <><p style={{ marginTop: 10 }}>Progresso: <b className="ok">{ck.progresso}</b></p>
              <ul>{(ck.itens || []).map(i => (
                <li key={i.id}><span className={i.ok ? 'ok' : 'no'}>{i.ok ? '✓' : '○'}</span> <b>{i.titulo}</b> — {i.como} <span className="mut">({i.onde})</span></li>
              ))}</ul></>)}
        </div>
        {GUIAS.map(([t, d], i) => (
          <div key={i} className="card"><h3>{t}</h3><p>{d}</p></div>
        ))}
      </div>
    </div>
  );
}
