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
    SELECT hero_title, hero_subtitle, about_title, artist_intro, awards_text, contact_email, contact_instagram, updated_at
    FROM site_profile
    WHERE id = 1
  `).first();

  return json(profile || {
    hero_title: '',
    hero_subtitle: '',
    about_title: '',
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

  const heroTitle = sanitizeText(body.hero_title);
  const heroSubtitle = sanitizeText(body.hero_subtitle);
  const aboutTitle = sanitizeText(body.about_title);
  const artistIntro = sanitizeText(body.artist_intro);
  const awardsText = sanitizeText(body.awards_text);
  const contactEmail = sanitizeText(body.contact_email);
  const contactInstagram = sanitizeText(body.contact_instagram);
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE site_profile
    SET hero_title = ?1,
        hero_subtitle = ?2,
        about_title = ?3,
        artist_intro = ?4,
        awards_text = ?5,
        contact_email = ?6,
        contact_instagram = ?7,
        updated_at = ?8
    WHERE id = 1
  `)
    .bind(heroTitle, heroSubtitle, aboutTitle, artistIntro, awardsText, contactEmail, contactInstagram, now)
    .run();

  return json({
    ok: true,
    hero_title: heroTitle,
    hero_subtitle: heroSubtitle,
    about_title: aboutTitle,
    artist_intro: artistIntro,
    awards_text: awardsText,
    contact_email: contactEmail,
    contact_instagram: contactInstagram,
    updated_at: now,
  });
}
