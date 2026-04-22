import { ensureSiteProfileTable, json } from '../_utils.js';

function normalizeBody(body = {}) {
  return {
    hero_title: String(body.heroTitle ?? body.hero_title ?? '').trim(),
    hero_subtitle: String(body.heroSubtitle ?? body.hero_subtitle ?? '').trim(),
    about_title: String(body.aboutTitle ?? body.about_title ?? '').trim(),
    about_body: String(body.aboutBody ?? body.about_body ?? ''),
    awards_text: String(body.awards ?? body.awards_text ?? ''),
    email: String(body.email ?? '').trim(),
    instagram_url: String(body.instagramUrl ?? body.instagram_url ?? '').trim(),
  };
}

export async function onRequestGet(context) {
  try {
    const DB = context.env.DB;
    await ensureSiteProfileTable(DB);

    const row = await DB.prepare(`
      SELECT
        id,
        hero_title,
        hero_subtitle,
        about_title,
        about_body,
        awards_text,
        email,
        instagram_url,
        created_at,
        updated_at
      FROM site_profile
      WHERE id = 1
      LIMIT 1
    `).first();

    return json({ profile: row || {} });
  } catch (err) {
    return json({ error: err?.message || '프로필 조회에 실패했습니다.' }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  try {
    const DB = context.env.DB;
    const body = await context.request.json();
    await ensureSiteProfileTable(DB);

    const p = normalizeBody(body);

    await DB.prepare(`
      INSERT INTO site_profile (
        id, hero_title, hero_subtitle, about_title, about_body, awards_text, email, instagram_url, created_at, updated_at
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT(id) DO UPDATE SET
        hero_title = excluded.hero_title,
        hero_subtitle = excluded.hero_subtitle,
        about_title = excluded.about_title,
        about_body = excluded.about_body,
        awards_text = excluded.awards_text,
        email = excluded.email,
        instagram_url = excluded.instagram_url,
        updated_at = CURRENT_TIMESTAMP
    `).bind(
      p.hero_title,
      p.hero_subtitle,
      p.about_title,
      p.about_body,
      p.awards_text,
      p.email,
      p.instagram_url
    ).run();

    const row = await DB.prepare(`
      SELECT
        id,
        hero_title,
        hero_subtitle,
        about_title,
        about_body,
        awards_text,
        email,
        instagram_url,
        created_at,
        updated_at
      FROM site_profile
      WHERE id = 1
      LIMIT 1
    `).first();

    return json({ ok: true, profile: row || {} });
  } catch (err) {
    return json({ error: err?.message || '프로필 저장에 실패했습니다.' }, { status: 500 });
  }
}
