import { json, badRequest, ensureSchema, fileExtension, uuid } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const form = await request.formData();
  const title = String(form.get('title') || '').trim();
  const year = String(form.get('year') || '').trim();
  const category = String(form.get('category') || '').trim();
  const tags = String(form.get('tags') || '').trim();
  const description = String(form.get('description') || '').trim();
  const isPublic = String(form.get('is_public') || '1') === '1' ? 1 : 0;
  const image = form.get('image');

  if (!title) return badRequest('제목을 입력하세요.');
  if (!(image instanceof File)) return badRequest('이미지 파일을 선택하세요.');

  const id = uuid();
  const ext = fileExtension(image.name);
  const imageKey = `${id}.${ext}`;
  const now = new Date().toISOString();

  await env.ART_BUCKET.put(imageKey, image.stream(), {
    httpMetadata: {
      contentType: image.type || 'application/octet-stream'
    }
  });

  await env.DB.prepare(`
    INSERT INTO artworks (id, title, description, year, category, tags, image_key, is_public, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, title, description, year, category, tags, imageKey, isPublic, now, now).run();

  return json({ ok: true, id });
}
