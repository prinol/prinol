import { json, ensureSchema, badRequest } from '../_utils.js';

export async function onRequestGet({ env }) {
  await ensureSchema(env);
  const profile = await env.DB.prepare('SELECT * FROM site_profile WHERE id = 1').first();
  return json({ profile });
}

export async function onRequestPost({ request, env }) {
  await ensureSchema(env);
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('잘못된 요청입니다.');

  await env.DB.prepare(`
    UPDATE site_profile SET
      hero_title = ?,
      hero_subtitle = ?,
      about_title = ?,
      about_body = ?,
      awards_text = ?,
      contact_email = ?,
      contact_instagram = ?,
      updated_at = ?
    WHERE id = 1
  `).bind(
    body.hero_title || 'PRINOL',
    body.hero_subtitle || '',
    body.about_title || '작가 소개',
    body.about_body || '',
    body.awards_text || '',
    body.contact_email || '',
    body.contact_instagram || '',
    new Date().toISOString()
  ).run();

  const profile = await env.DB.prepare('SELECT * FROM site_profile WHERE id = 1').first();
  return json({ ok: true, profile });
}
