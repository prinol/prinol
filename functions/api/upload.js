import { badRequest, json, requireAdmin, sanitizeText, normalizeBool } from '../_utils';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

  const form = await request.formData();
  const file = form.get('image');
  if (!(file instanceof File)) return badRequest('이미지 파일이 필요합니다.');
  if (!file.type.startsWith('image/')) return badRequest('이미지 파일만 업로드할 수 있습니다.');
  if (file.size > MAX_IMAGE_SIZE) return badRequest('이미지 용량은 10MB 이하만 허용됩니다.');

  const title = sanitizeText(form.get('title'));
  if (!title) return badRequest('제목이 필요합니다.');

  const category = sanitizeText(form.get('category'));
  const description = sanitizeText(form.get('description'));
  const tags = sanitizeText(form.get('tags'));
  const year = sanitizeText(form.get('year')) || null;
  const isPublic = normalizeBool(form.get('isPublic'));

  const extension = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'jpg';
  const imageKey = `${Date.now()}-${crypto.randomUUID()}.${extension}`;

  await env.ART_BUCKET.put(imageKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO artworks (id, title, description, year, category, tags, image_key, is_public, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
  `)
    .bind(id, title, description, year, category, tags, imageKey, isPublic, now, now)
    .run();

  return json({
    ok: true,
    id,
    image_key: imageKey,
    image_url: `/images/${encodeURIComponent(imageKey)}`,
  });
}
