export const runtime = 'edge';

export async function GET() {
  const resultado = {
    timestamp: new Date().toISOString(),
    ok: true,
    env: {
      tem_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      tem_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
      key_prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 30) || null,
      key_length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    },
    testes: {}
  };

  // Teste 1 — fetch básico ao Supabase
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      resultado.testes.supabase_fetch = { ok: false, erro: 'env vars faltando' };
    } else {
      const res = await fetch(`${url}/rest/v1/quizzes?select=slug&limit=1`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });
      const body = await res.text();
      resultado.testes.supabase_fetch = {
        ok: res.ok,
        status: res.status,
        body: body.slice(0, 500)
      };
    }
  } catch (e) {
    resultado.testes.supabase_fetch = { ok: false, erro: e.message };
  }

  // Teste 2 — gerar UUID (usado pelo tracking)
  try {
    const uuid = crypto.randomUUID();
    resultado.testes.crypto_uuid = { ok: true, uuid };
  } catch (e) {
    resultado.testes.crypto_uuid = { ok: false, erro: e.message };
  }

  // Teste 3 — sessionStorage (não deve existir no server, mas não deve quebrar)
  try {
    const temWindow = typeof window !== 'undefined';
    resultado.testes.window = { ok: true, tem_window: temWindow };
  } catch (e) {
    resultado.testes.window = { ok: false, erro: e.message };
  }

  // Teste 4 — query simples ao Supabase com o client oficial
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data, error } = await sb.from('quizzes').select('slug').limit(2);
    resultado.testes.supabase_client = {
      ok: !error,
      erro: error?.message || null,
      data: data || null
    };
  } catch (e) {
    resultado.testes.supabase_client = { ok: false, erro: e.message };
  }

  return new Response(JSON.stringify(resultado, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}