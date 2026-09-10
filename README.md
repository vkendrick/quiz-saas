# Quiz SaaS

Sistema de quiz dinâmico multi-quiz com:
- Quiz dinâmico (perguntas, opções, branching, A/B test)
- Métricas por pergunta, dispositivo, campanha e tempo
- CRM simples interno (pipeline, tags, notas, histórico, export CSV)
- Página de resultado personalizada por score
- Upload de mídia (Supabase Storage)
- Pixels dinâmicos por quiz: Meta, GA4, GTM, Google Ads, TikTok, Clarity

## Setup local

1. `npm install`
2. Copie `.env.example` → `.env.local` e preencha com credenciais do Supabase
3. Rode os arquivos `supabase/migrations/001_init.sql` e `002_features.sql` no SQL Editor do Supabase
4. `npm run dev`

## Deploy Cloudflare Pages

- Build command: `npx @cloudflare/next-on-pages@1`
- Build output: `.vercel/output/static`
- Node: 20
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
