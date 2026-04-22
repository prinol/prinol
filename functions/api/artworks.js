import { json, requireAdmin } from '../_utils';

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const wantsAll = url.searchParams.get('all') === '1';

  if (wantsAll) {
    const auth = requireAdmin(request, env);
    if (!auth.ok) return json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });
  }

  const stmt = wantsAll
    ? env.DB.prepare(`
        SELECT id, title, description, year, category, tags, image_key, is_public, created_at, updated_at
        FROM artworks
        ORDER BY datetime(created_at) DESC
      `)
    : env.DB.prepare(`
        SELECT id, title, description, year, category, tags, image_key, is_public, created_at, updated_at
        FROM artworks
        WHERE is_public = 1
        ORDER BY datetime(created_at) DESC
      `);

  const { results } = await stmt.all();
  const items = (results || []).map((item) => ({
    ...item,
    image_url: `/images/${encodeURIComponent(item.image_key)}`,
  }));

  return json(items, {
    headers: wantsAll ? {} : { 'cache-control': 'public, max-age=60' },
  });
}
