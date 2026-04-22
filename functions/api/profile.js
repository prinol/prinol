import { badRequest, json, requireAdmin, sanitizeText, ensureSiteProfileTable } from '../_utils';

export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const wantsAdmin = url.searchParams.get('admin') === '1';

  if (wantsAdmin) {
    const auth = requireAdmin(request, env);
    if (!auth.ok) return json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });
  }

  await ensureSiteProfileTable(env);
  const profile = await env.DB.prepare(`
    SELECT artist_intro, awards_text, contact_email, contact_instagram, updated_at
    FROM site_profile
    WHERE id = 1
  `).first();

  return json(profile || {
    artist_intro: '',
    awards_text: '',
    contact_email: '',
    contact_instagram: '',
    updated_at: '',
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = requireAdmin(request, env);
  if (!auth.ok) return json({ error: '관리자 인증이 필요합니다.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return badRequest('수정할 내용이 필요합니다.');

  await ensureSiteProfileTable(env);

  const artistIntro = sanitizeText(body.artist_intro);
  const awardsText = sanitizeText(body.awards_text);
  const contactEmail = sanitizeText(body.contact_email);
  const contactInstagram = sanitizeText(body.contact_instagram);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE site_profile
    SET artist_intro = ?1,
        awards_text = ?2,
        contact_email = ?3,
        contact_instagram = ?4,
        updated_at = ?5
    WHERE id = 1
  `)
    .bind(artistIntro, awardsText, contactEmail, contactInstagram, now)
    .run();

  return json({
    ok: true,
    artist_intro: artistIntro,
    awards_text: awardsText,
    contact_email: contactEmail,
    contact_instagram: contactInstagram,
    updated_at: now,
  });
}
