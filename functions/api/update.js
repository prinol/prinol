import { json, badRequest, ensureSchema, fileExtension, uuid, makeImageUrl } from '../_utils.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function allowedImageType(type = '') {
  return ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'].includes(String(type).toLowerCase());
}

async function findArtwork(DB, id) {
  return DB.prepare('SELECT * FROM artworks WHERE id = ? LIMIT 1').bind(id).first();
}

function toFlag(value, fallback = 0) {
  if (value === undefined || value === null || value === '') return fallback ? 1 : 0;
  return String(value) === '1' || value === true ? 1 : 0;
}

async function updateMetadataOnly(context, body) {
  const { env, request } = context;
  await ensureSchema(env.DB);

  const id = normalizeText(body.id);
  if (!id) return badRequest('작품 ID가 필요합니다.');

  const existing = await findArtwork(env.DB, id);
  if (!existing) return json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });

  const title = normalizeText(body.title);
  if (!title) return badRequest('작품명을 입력하세요.');

  const year = normalizeText(body.year);
  const category = normalizeText(body.category);
  const tags = normalizeText(body.tags);
  const description = String(body.description ?? '');
  const isPublic = toFlag(body.is_public ?? body.isPublic, existing.is_public ?? 1);
  const isPinned = toFlag(body.is_pinned ?? body.isPinned, existing.is_pinned ?? 0);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE artworks
    SET title = ?, year = ?, category = ?, tags = ?, description = ?, is_public = ?, is_pinned = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    title, year, category, tags, description, isPublic, isPinned, now, id
  ).run();

  const item = await findArtwork(env.DB, id);
  return json({
    ok: true,
    item: {
      ...item,
      is_public: Number(item?.is_public ?? 1),
      is_pinned: Number(item?.is_pinned ?? 0),
      image_url: makeImageUrl(request, item?.image_key || ''),
    },
  });
}

async function updateWithReplacementImage(context, formData) {
  const { env, request } = context;
  await ensureSchema(env.DB);

  if (!env.ART_BUCKET) {
    return json({ error: 'R2 바인딩 ART_BUCKET이 설정되지 않았습니다.' }, { status: 500 });
  }

  const id = normalizeText(formData.get('id'));
  if (!id) return badRequest('작품 ID가 필요합니다.');

  const existing = await findArtwork(env.DB, id);
  if (!existing) return json({ error: '작품을 찾을 수 없습니다.' }, { status: 404 });

  const file = formData.get('file');
  if (!(file instanceof File)) return badRequest('교체할 이미지 파일이 필요합니다.');
  if (!allowedImageType(file.type)) return badRequest('jpg, png, webp, gif 형식의 이미지 파일만 업로드할 수 있습니다.');

  const title = normalizeText(formData.get('title'));
  if (!title) return badRequest('작품명을 입력하세요.');

  const year = normalizeText(formData.get('year'));
  const category = normalizeText(formData.get('category'));
  const tags = normalizeText(formData.get('tags'));
  const description = String(formData.get('description') ?? '');
  const isPublic = toFlag(formData.get('is_public'), existing.is_public ?? 1);
  const isPinned = toFlag(formData.get('is_pinned'), existing.is_pinned ?? 0);

  const ext = fileExtension(file.name) || (
    file.type === 'image/png' ? '.png' :
    file.type === 'image/webp' ? '.webp' :
    file.type === 'image/gif' ? '.gif' : '.jpg'
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
  `).bind(
    title, year, category, tags, description, isPublic, isPinned, newImageKey, now, id
  ).run();

  const oldKey = normalizeText(formData.get('old_image_key')) || existing.image_key || '';
  if (oldKey && oldKey !== newImageKey) {
    try {
      await env.ART_BUCKET.delete(oldKey);
    } catch (err) {
      console.warn('old image delete failed', err);
    }
  }

  const item = await findArtwork(env.DB, id);
  return json({
    ok: true,
    item: {
      ...item,
      is_public: Number(item?.is_public ?? 1),
      is_pinned: Number(item?.is_pinned ?? 0),
      image_url: makeImageUrl(request, item?.image_key || ''),
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

    let body = {};
    try {
      body = await context.request.json();
    } catch {
      return badRequest('JSON 본문을 읽을 수 없습니다.');
    }
    return await updateMetadataOnly(context, body);
  } catch (err) {
    return json({ error: err?.message || '작품 수정에 실패했습니다.' }, { status: 500 });
  }
}
