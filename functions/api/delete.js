import { badRequest, json, requireAdmin } from '../_utils';

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.id) return badRequest('id가 필요합니다.');

  const item = await env.DB.prepare(`SELECT image_key FROM artworks WHERE id = ?1`).bind(body.id).first();
  if (!item) return json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });

  await env.ART_BUCKET.delete(item.image_key);
  await env.DB.prepare(`DELETE FROM artworks WHERE id = ?1`).bind(body.id).run();

  return json({ ok: true });
}
