// STAGE → quiz-saas/app/api/prisma/admin/upload-url/route.js
// POST {tenant, path, bucket?: media|files} → signed URL de upload (1h).
// media = tenant-media (público: imagens da página); files = tenant-files (privado: PDFs).
import { createClient } from '@supabase/supabase-js';
import { requireOperator, requirePapel, erroPapel } from '@/lib/prisma-op';

export async function POST(request) {
  const { tenant, path, bucket } = await request.json().catch(() => ({}));
  const { op, negado } = await requirePapel(request, tenant, 'admin');
  if (negado || !op) return Response.json(erroPapel(negado), { status: negado ? 403 : 401 });
  const clean = String(path || '').replace(/^\/+/, '').replace(/\.\./g, '');
  if (!clean) return Response.json({ error: 'path obrigatório' }, { status: 400 });
  const bk = bucket === 'media' ? 'tenant-media' : 'tenant-files';
  // TRAVAS: imagens só WEBP (pequenas, otimizadas); arquivos só PDF/ZIP/MP4.
  // Tamanho máximo: configurar no bucket (dashboard Supabase → Storage).
  const ext = (clean.split('.').pop() || '').toLowerCase();
  const permitidas = bk === 'tenant-media' ? ['webp'] : ['pdf', 'webp', 'zip', 'mp4'];
  if (!permitidas.includes(ext)) {
    return Response.json({ error: `Formato bloqueado. Permitidos: ${permitidas.join(', ')}` }, { status: 400 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase.storage.from(bk)
    .createSignedUploadUrl(`${tenant}/${clean}`);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const publicUrl = bk === 'tenant-media'
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bk}/${tenant}/${clean}` : null;
  return Response.json({ ok: true, ...data, file_key: `${tenant}/${clean}`, public_url: publicUrl });
}
