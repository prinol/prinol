import { json, ensureSchema, makeImageUrl } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  await ensureSchema(env);
  const url = new URL(request.url);
  const adminMode = url.searchParams.get('admin') === '1';
  const stmt = adminMode
    ? env.DB.prepare('SELECT * FROM artworks ORDER BY created_at DESC')
    : env.DB.prepare('SELECT * FROM artworks WHERE is_public = 1 ORDER BY created_at DESC');
  const { results } = await stmt.all();
  const items = (results || []).map(row => ({
    ...row,
    image_url: makeImageUrl(request, row.image_key)
  }));
  return json({ items });
}
