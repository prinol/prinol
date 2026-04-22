import { json, ensureSchema, badRequest, serverError } from '../_utils.js';

async function getProfile(env) {
  return await env.DB.prepare('SELECT * FROM site_profile WHERE id = 1').first();
}

export async function onRequestGet({ env }) {
  try {
    await ensureSchema(env);
    const profile = await getProfile(env);
    return json({ profile });
  } catch (error) {
    return serverError('프로필을 불러오지 못했습니다.', String(error?.message || error));
  }
}

export async function onRequestPost({ request, env }) {
  try {
    await ensureSchema(env);
    const body = await request.json().catch(() => null);
    if (!body) return badRequest('잘못된 요청입니다.');

    await env.DB.prepare(`
      INSERT INTO site_profile (
        id, hero_title, hero_subtitle, about_title, about_body,
        awards_text, contact_email, contact_instagram, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        hero_title = excluded.hero_title,
        hero_subtitle = excluded.hero_subtitle,
        about_title = excluded.about_title,
        about_body = excluded.about_body,
        awards_text = excluded.awards_text,
        contact_email = excluded.contact_email,
        contact_instagram = excluded.contact_instagram,
        updated_at = excluded.updated_at
    `).bind(
      1,
      body.hero_title || 'PRINOL',
      body.hero_subtitle || '',
      body.about_title || '작가 소개',
      body.about_body || '',
      body.awards_text || '',
      body.contact_email || '',
      body.contact_instagram || '',
      new Date().toISOString()
    ).run();

    const profile = await getProfile(env);
    return json({ ok: true, profile });
  } catch (error) {
    return serverError('프로필 저장에 실패했습니다.', String(error?.message || error));
  }
}
