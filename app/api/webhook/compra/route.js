import { createClient } from '@supabase/supabase-js';
// Webhook genérico — funciona com Hotmart, Kiwify, Perfect Pay, etc.
// Cada plataforma envia formato diferente, então aceitamos vários campos.
export async function POST(request) {
  try {
    const body = await request.json();
    const url = new URL(request.url);
    const quizId = url.searchParams.get('quiz_id');
    const secret = url.searchParams.get('secret');

    if (!quizId) {
      return Response.json({ error: 'quiz_id obrigatório' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verifica o secret do quiz
    const { data: quiz } = await supabase
      .from('quizzes')
      .select('id, checkout_webhook_secret, checkout_tipo')
      .eq('id', quizId)
      .single();

    if (!quiz) {
      return Response.json({ error: 'Quiz não encontrado' }, { status: 404 });
    }

    if (quiz.checkout_webhook_secret && quiz.checkout_webhook_secret !== secret) {
      return Response.json({ error: 'Secret inválido' }, { status: 401 });
    }

    // Extrai dados comuns (varia por plataforma)
    const email = body?.customer?.email
      || body?.buyer?.email
      || body?.data?.buyer?.email
      || body?.email;

    const valor = parseFloat(
      body?.purchase?.price?.value
      || body?.data?.purchase?.price?.value
      || body?.transaction_amount
      || body?.value
      || 0
    );

    if (!email) {
      return Response.json({ error: 'Email do comprador não encontrado no payload' }, { status: 400 });
    }

    // Atualiza o lead
    const { data: leads } = await supabase
      .from('leads')
      .update({
        status_pipeline: 'comprou',
        comprou_em: new Date().toISOString(),
        valor_pago: valor
      })
      .eq('quiz_id', quizId)
      .eq('email', email.toLowerCase())
      .select();

    // Registra log pra debug
    await supabase.from('lead_cta_cliques').insert({
      quiz_id: quizId,
      cta_url: 'webhook-compra',
      cta_texto: `Compra confirmada: R$ ${valor}`,
      metadata: { email, valor, payload_original: body }
    });

    return Response.json({
      ok: true,
      leads_atualizados: leads?.length || 0,
      email,
      valor
    });
  } catch (e) {
    console.error('Erro no webhook:', e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}