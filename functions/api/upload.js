import { json, badRequest, ensureSchema, fileExtension, uuid } from '../_utils.js';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function allowedImageType(type = '') {
  return [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/jpg',
  ].includes(String(type).toLowerCase());
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;

    if (!env.ART_BUCKET) {
      return json({ error: 'R2 바인딩 ART_BUCKET이 설정되지 않았습니다.' }, { status: 500 });
    }
    if (!env.DB) {
      return json({ error: 'D1 바인딩 DB가 설정되지 않았습니다.' }, { status: 500 });
    }

    await ensureSchema(env.DB);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return badRequest('이미지 파일이 필요합니다.');
    }

    if (!allowedImageType(file.type)) {
      return badRequest('jpg, png, webp, gif 형식의 이미지 파일만 업로드할 수 있습니다.');
    }

    const title = normalizeText(formData.get('title'));
    const year = normalizeText(formData.get('year'));
    const category = normalizeText(formData.get('category'));
    const tags = normalizeText(formData.get('tags'));
    const description = normalizeText(formData.get('description'));
    const isPublic = String(formData.get('is_public') ?? '1') === '1' ? 1 : 0;

    if (!title) {
      return badRequest('작품명을 입력하세요.');
    }

    const ext = fileExtension(file.name) || (
      file.type === 'image/png' ? '.png' :
      file.type === 'image/webp' ? '.webp' :
      file.type === 'image/gif' ? '.gif' :
      '.jpg'
    );

    const id = uuid();
    const imageKey = `artworks/${id}${ext}`;
    const bytes = await file.arrayBuffer();

    await env.ART_BUCKET.put(imageKey, bytes, {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
    });

    const now = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO artworks (
        id, title, description, year, category, tags, image_key, is_public, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      title,
      description,
      year,
      category,
      tags,
      imageKey,
      isPublic,
      now,
      now
    ).run();

    return json({
      ok: true,
      item: {
        id,
        title,
        description,
        year,
        category,
        tags,
        image_key: imageKey,
        is_public: isPublic,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (err) {
    return json(
      {
        error: err?.message || '작품 등록에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}
