// STAGE → quiz-saas/app/vendas/page.js (ARQUIVO NOVO)
// Home comercial do Prisma p/ gestores de tráfego (copy docs: home-gestores).
// Estática (gera sem banco). CTA → /api/prisma/billing/checkout.
import Link from 'next/link';
import Depoimentos from '@/components/Depoimentos';

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
.prisma{background:#0B0E14;color:#E8ECF3;font-family:-apple-system,'Segoe UI',Roboto,Inter,sans-serif}
.hero{background:radial-gradient(900px 380px at 50% -80px,#16233a 0%,#0B0E14 65%);text-align:center;padding:84px 20px 64px}
.eyebrow{font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#2EAA84;margin-bottom:18px}
h1{font-size:clamp(30px,5vw,54px);line-height:1.15;max-width:820px;margin:0 auto 18px;font-weight:800}
h1 em{font-style:normal;color:#2EAA84}
.sub{color:#9AA4B5;font-size:18px;max-width:620px;margin:0 auto 32px;line-height:1.6}
.btn{display:inline-block;background:#2EAA84;color:#fff;padding:17px 38px;border-radius:12px;font-size:17px;font-weight:800;text-decoration:none}
.btn:hover{background:#24956f}
.btn.ghost{background:transparent;border:1px solid #232B3B;color:#E8ECF3;margin-left:12px}
.micro{font-size:13px;color:#9AA4B5;margin-top:16px}
section{padding:64px 20px}.wrap{max-width:960px;margin:0 auto}
h2{font-size:clamp(22px,3.5vw,34px);margin-bottom:14px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:28px}
.card{background:#151A24;border:1px solid #232B3B;border-radius:16px;padding:24px}
.card h3{font-size:17px;margin-bottom:8px}
.card p{color:#9AA4B5;font-size:14px;line-height:1.6}
.card.destaque{border-color:#2EAA84}
.preco{font-size:40px;font-weight:800;margin:8px 0}
.preco small{font-size:14px;color:#9AA4B5;font-weight:400}
ul.feat{list-style:none;margin:16px 0 24px;display:flex;flex-direction:column;gap:8px;font-size:14px;color:#9AA4B5}
ul.feat li::before{content:'✓ ';color:#2EAA84;font-weight:700}
.faq{background:#151A24;border:1px solid #232B3B;border-radius:12px;margin-bottom:10px;overflow:hidden}
.faq summary{padding:16px 20px;cursor:pointer;font-size:15px;list-style:none}
.faq summary::-webkit-details-marker{display:none}
.faq div{padding:0 20px 16px;color:#9AA4B5;font-size:14px}
footer{text-align:center;color:#9AA4B5;font-size:12px;padding:36px}
.planos{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:28px}
`;

const DOR = [
  ['O prejuízo invisível', 'Conjunto com CPA 2× o teto rodando há 3 dias porque ninguém olhou. Quanto você já perdeu assim este mês?'],
  ['O relatório mentiroso', 'A Meta diz que vendeu; o checkout diz outra coisa. Sem match venda↔anúncio, você otimiza no escuro.'],
  ['O cliente no seu pé', '“E aí, como estão as campanhas?” — e você montando planilha manual todo domingo.'],
];
const PILAR = [
  ['Tracking real', 'Cada venda carrega o ad_id de origem. Faturamento, lucro e ROAS por campanha, conjunto e anúncio.'],
  ['Automação que age', 'Regras em português claro. Começa sugerindo, você aprova; depois roda sozinha. Com log de tudo.'],
  ['Tudo no mesmo lugar', 'Quiz, página de vendas, entrega e gestão. Sem 5 ferramentas, sem planilha.'],
];
const GANHO = [
  ['Dinheiro', 'Corta o desperdício: conjuntos estourados pausados em minutos, não dias.'],
  ['Tempo', 'Sem planilha de fim de semana; relatório pronto para mandar ao cliente.'],
  ['Clientes', 'ROAS defendido com dados + alertas antes do problema virar reclamação.'],
];
const FAQ = [
  ['Funciona com meu checkout?', 'Sim: Hotmart, Kiwify, Stripe e outros via webhook universal.'],
  ['Preciso trocar minha estrutura?', 'Não: conecta a BM, escolhe as campanhas, pronto.'],
  ['E se a automação errar?', 'Começa em modo sugestão; nada executa sem sua aprovação. Log de tudo.'],
  ['Meus dados estão seguros?', 'Token cifrado, acesso por tenant, você revoga quando quiser.'],
];

export default function Vendas() {
  return (
    <div className="prisma"><style>{CSS}</style>
      <div className="hero">
        <div style={{ maxWidth: 960, margin: '0 auto 28px', display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/entrar" style={{ color: '#E8ECF3', fontSize: 14, textDecoration: 'none', border: '1px solid #232B3B', borderRadius: 10, padding: '8px 18px' }}>Entrar →</Link>
        </div>
        <p className="eyebrow">Para gestores de tráfego pago</p>
        <h1>Suas campanhas queimam orçamento de madrugada — <em>e você só descobre de manhã.</em></h1>
        <p className="sub">O Prisma liga cada venda ao anúncio que a gerou e pausa/escala sozinho quando o CPA estoura. Você dorme, ele vigia.</p>
        <Link className="btn" href="#planos">Testar 14 dias grátis</Link>
        <Link className="btn ghost" href="#exemplos">Ver exemplos reais</Link>
        <p style={{ marginTop: 18, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/demo/unha/quiz.html" style={{ color: '#2EAA84', fontSize: 14 }}>Quiz demo →</Link>
          <Link href="/PRISMA/p/codigo-da-unha" style={{ color: '#2EAA84', fontSize: 14 }}>Landing demo →</Link>
          <Link href="/PRISMA/gestao" style={{ color: '#2EAA84', fontSize: 14 }}>Dashboard demo →</Link>
        </p>
        <p className="micro">Sem cartão · Cancela quando quiser · Hotmart, Kiwify e Stripe</p>
      </div>
      <section><div className="wrap">
        <h2>Onde o dinheiro vaza hoje</h2>
        <div className="grid">{DOR.map(([t, d]) => <div key={t} className="card"><h3>{t}</h3><p>{d}</p></div>)}</div>
      </div></section>
      <section><div className="wrap">
        <h2>Como o Prisma resolve</h2>
        <div className="grid">{PILAR.map(([t, d]) => <div key={t} className="card destaque"><h3>{t}</h3><p>{d}</p></div>)}</div>
      </div></section>
      <section><div className="wrap">
        <h2>O que você ganha</h2>
        <div className="grid">{GANHO.map(([t, d]) => <div key={t} className="card"><h3>{t}</h3><p>{d}</p></div>)}</div>
      </div></section>
      <section id="exemplos"><div className="wrap">
        <h2>Veja na prática: quiz, landing e dashboard</h2>
        <p className="sub" style={{ color: '#9AA4B5', marginTop: 8 }}>Os 3 diferenciais que vendem por você — todos gerenciáveis sem código.</p>
        <div className="grid">
          <div className="card destaque"><h3>Quiz diagnóstico</h3><p>5 perguntas que diagnosticam e levam à oferta certa. Capture leads no automático.</p>
            <p style={{ marginTop: 14 }}><Link className="btn ghost" href="/quiz/diagnostico-funil">Fazer meu diagnóstico →</Link></p></div>
          <div className="card destaque"><h3>Landing de alta conversão</h3><p>Templates validados por nicho: dor, prova, bônus, preço, FAQ — com sua identidade e seu checkout.</p>
            <p style={{ marginTop: 14 }}><Link className="btn ghost" href="/PRISMA/p/codigo-da-unha">Abrir landing demo →</Link></p></div>
          <div className="card destaque"><h3>Dashboard + automação</h3><p>Cada venda ligada ao anúncio. Regras que pausam o que estoura e escalam o que converte.</p>
            <p style={{ marginTop: 14 }}><Link className="btn ghost" href="/demo">Testar dashboard demo →</Link></p></div>
        </div>
      </div></section>
      <section id="planos"><div className="wrap">
        <h2>Planos</h2>
        <div className="planos">
          <div className="card"><h3>Free</h3><p>Publique e venda antes de pagar.</p>
            <div className="preco">R$0</div>
            <ul className="feat"><li>1 produto</li><li>1 quiz ou página</li><li>Até R$500 rastreados</li></ul>
            <Link className="btn ghost" href="/cadastro">Começar grátis</Link></div>
          <div className="card destaque"><h3>Starter</h3><p>Fez a 1ª venda e quer escalar.</p>
            <div className="preco">R$67<small>/mês + 4,9%</small></div>
            <ul className="feat"><li>Produtos ilimitados</li><li>Quiz + páginas + membros</li><li>Automação (aprovar)</li></ul>
            <Link className="btn" href="/api/prisma/billing/checkout?plan=starter">Assinar Starter</Link></div>
          <div className="card"><h3>Pro</h3><p>Operação rodando todo dia.</p>
            <div className="preco">R$197<small>/mês + 2,9%</small></div>
            <ul className="feat"><li>Tudo do Starter</li><li>Automação automática</li><li>Multi-moeda + multi-BM</li></ul>
            <Link className="btn" href="/api/prisma/billing/checkout?plan=pro">Assinar Pro</Link></div>
          <div className="card"><h3>Scale</h3><p>Volume e escala.</p>
            <div className="preco">R$397<small>/mês + 1,9%</small></div>
            <ul className="feat"><li>Tudo do Pro</li><li>Limites maiores</li><li>Suporte prioritário</li></ul>
            <Link className="btn" href="/api/prisma/billing/checkout?plan=scale">Assinar Scale</Link></div>
        </div>
      </div></section>
      <section><div className="wrap">
        <h2>Quem usa, recomenda</h2>
        <Depoimentos tenant="PRISMA" contexto="vendas" escuro />
      </div></section>
      <section><div className="wrap">
        <h2>Perguntas frequentes</h2>
        <div style={{ marginTop: 20 }}>{FAQ.map(([p, r]) => (
          <details key={p} className="faq"><summary>{p}</summary><div>{r}</div></details>))}</div>
      </div></section>
      <footer>Prisma · vendas, entrega e gestão Meta Ads · © 2026</footer>
    </div>
  );
}
