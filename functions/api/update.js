import { json, badRequest, ensureSchema, fileExtension, uuid, makeImageUrl } from '../_utils.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function allowedImageType(type = '') {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'].includes(String(type).toLowerCase());
}

async function updateMetadataOnly(context, body) {
  const { env, request } = context;
  await ensureSchema(env.DB);

  const id = normalizeText(body.id);
  if (!id) return badRequest('작품 ID가 필요합니다.');

  const title = normalizeText(body.title);
  const year = normalizeText(body.year);
  const category = normalizeText(body.category);
  const tags = normalizeText(body.tags);
  const description = String(body.description ?? '');
  const isPublic = String(body.is_public ?? body.isPublic ?? '1') === '1' ? 1 : 0;
  const isPinned = String(body.is_pinned ?? body.isPinned ?? '0') === '1' ? 1 : 0;

  if (!title) return badRequest('작품명을 입력하세요.');

  const existing = await env.DB.prepare('SELECT * FROM artworks WHERE id = ? LIMIT 1').bind(id).first();
  if (!existing) return json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });

  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE artworks
    SET title = ?, year = ?, category = ?, tags = ?, description = ?, is_public = ?, is_pinned = ?, updated_at = ?
    WHERE id = ?
  `).bind(title, year, category, tags, description, isPublic, isPinned, now, id).run();

  const item = await env.DB.prepare('SELECT * FROM artworks WHERE id = ? LIMIT 1').bind(id).first();
  return json({
    ok: true,
    item: {
      ...item,
      is_public: Number(item.is_public ?? 1),
      is_pinned: Number(item.is_pinned ?? 0),
      image_url: makeImageUrl(request, item.image_key || ''),
    },
  });
}

async function updateWithReplacementImage(context, formData) {
  const { env, request } = context;
  await ensureSchema(env.DB);

  const id = normalizeText(formData.get('id'));
  const oldImageKey = normalizeText(formData.get('old_image_key'));
  const file = formData.get('file');

  if (!id) return badRequest('작품 ID가 필요합니다.');
  if (!(file instanceof File)) return badRequest('교체할 이미지 파일이 필요합니다.');
  if (!allowedImageType(file.type)) return badRequest('jpg, png, webp, gif 형식의 이미지 파일만 업로드할 수 있습니다.');

  const title = normalizeText(formData.get('title'));
  const year = normalizeText(formData.get('year'));
  const category = normalizeText(formData.get('category'));
  const tags = normalizeText(formData.get('tags'));
  const description = String(formData.get('description') ?? '');
  const isPublic = String(formData.get('is_public') ?? '1') === '1' ? 1 : 0;
  const isPinned = String(formData.get('is_pinned') ?? '0') === '1' ? 1 : 0;

  if (!title) return badRequest('작품명을 입력하세요.');

  const existing = await env.DB.prepare('SELECT * FROM artworks WHERE id = ? LIMIT 1').bind(id).first();
  if (!existing) return json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });

  const ext = fileExtension(file.name) || (
    file.type === 'image/png' ? '.png' :
    file.type === 'image/webp' ? '.webp' :
    file.type === 'image/gif' ? '.gif' :
    '.jpg'
  );

  const newImageKey = `${uuid()}${ext}`;
  const bytes = await file.arrayBuffer();

  await env.ART_BUCKET.put(newImageKey, bytes, {
    httpMetadata: { contentType: file.type || 'application/octet-stream' },
  });

  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE artworks
    SET title = ?, year = ?, category = ?, tags = ?, description = ?, is_public = ?, is_pinned = ?, image_key = ?, updated_at = ?
    WHERE id = ?
  `).bind(title, year, category, tags, description, isPublic, isPinned, newImageKey, now, id).run();

  const removableKey = oldImageKey || existing.image_key || '';
  if (removableKey && removableKey !== newImageKey) {
    try {
      await env.ART_BUCKET.delete(removableKey);
    } catch (err) {
      console.warn(err);
    }
  }

  const item = await env.DB.prepare('SELECT * FROM artworks WHERE id = ? LIMIT 1').bind(id).first();
  return json({
    ok: true,
    item: {
      ...item,
      is_public: Number(item.is_public ?? 1),
      is_pinned: Number(item.is_pinned ?? 0),
      image_url: makeImageUrl(request, item.image_key || ''),
    },
  });
}

export async function onRequestPost(context) {
  try {
    const contentType = context.request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      return await updateWithReplacementImage(context, formData);
    }
    const body = await context.request.json();
    return await updateMetadataOnly(context, body);
  } catch (err) {
    return json({ error: err?.message || '작품 수정에 실패했습니다.' }, { status: 500 });
  }
}
