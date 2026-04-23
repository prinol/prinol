import { json, badRequest, ensureSchema } from '../_utils.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

async function findArtwork(DB, id) {
  return DB.prepare('SELECT * FROM artworks WHERE id = ? LIMIT 1').bind(id).first();
}

export async function onRequestPost(context) {
  try {
    const { env } = context;
    await ensureSchema(env.DB);

    let body = {};
    try {
      body = await context.request.json();
    } catch {
      return badRequest('JSON 본문을 읽을 수 없습니다.');
    }

    const id = normalizeText(body.id);
    if (!id) return badRequest('작품 ID가 필요합니다.');

    const existing = await findArtwork(env.DB, id);
    if (!existing) {
      return json({ ok: true, deleted: false, message: '이미 삭제되었거나 존재하지 않습니다.' });
    }

    await env.DB.prepare('DELETE FROM artworks WHERE id = ?').bind(id).run();

    const imageKey = normalizeText(body.image_key) || existing.image_key || '';
    if (env.ART_BUCKET && imageKey) {
      try {
        await env.ART_BUCKET.delete(imageKey);
      } catch (err) {
        console.warn('image delete failed', err);
      }
    }

    return json({ ok: true, deleted: true, id });
  } catch (err) {
    return json({ error: err?.message || '작품 삭제에 실패했습니다.' }, { status: 500 });
  }
}
