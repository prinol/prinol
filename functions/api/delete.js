import { json, badRequest, ensureSchema } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const body = await request.json().catch(() => null);
  if (!body || !body.id) return badRequest('작품 ID가 필요합니다.');

  const existing = await env.DB.prepare('SELECT * FROM artworks WHERE id = ?').bind(body.id).first();
  if (!existing) return json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });

  await env.ART_BUCKET.delete(existing.image_key);
  await env.DB.prepare('DELETE FROM artworks WHERE id = ?').bind(body.id).run();
  return json({ ok: true });
}
