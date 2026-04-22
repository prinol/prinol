import { badRequest, json, requireAdmin } from '../_utils';

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.id) return badRequest('id가 필요합니다.');
  if (typeof body.is_public !== 'boolean' && body.is_public !== 0 && body.is_public !== 1) {
    return badRequest('변경할 is_public 값이 필요합니다.');
  }

  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE artworks
    SET is_public = ?1, updated_at = ?2
    WHERE id = ?3
  `)
    .bind(body.is_public ? 1 : 0, now, body.id)
    .run();

  return json({ ok: true });
}
