import { json, badRequest, ensureSchema } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const body = await request.json().catch(() => null);
  if (!body || !body.id) return badRequest('작품 ID가 필요합니다.');

  const existing = await env.DB.prepare('SELECT * FROM artworks WHERE id = ?').bind(body.id).first();
  if (!existing) return json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });

  await env.DB.prepare(`
    UPDATE artworks SET
      title = ?,
      description = ?,
      year = ?,
      category = ?,
      tags = ?,
      is_public = ?,
      updated_at = ?
    WHERE id = ?
  `).bind(
    String(body.title || ''),
    String(body.description || ''),
    String(body.year || ''),
    String(body.category || ''),
    String(body.tags || ''),
    Number(body.is_public) === 1 ? 1 : 0,
    new Date().toISOString(),
    body.id
  ).run();

  return json({ ok: true });
}
