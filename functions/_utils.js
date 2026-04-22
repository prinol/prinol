const ADMIN_COOKIE = 'prinol_admin_session';

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=UTF-8',
      'cache-control': 'no-store',
      ...(init.headers || {}),
    },
    status: init.status || 200,
  });
}

export function unauthorized(message = '인증 실패') {
  return json({ error: message }, { status: 401 });
}

export function badRequest(message = '잘못된 요청') {
  return json({ error: message }, { status: 400 });
}

export function parseAuth(request) {
  const value = request.headers.get('authorization') || '';
  return value.startsWith('Bearer ') ? value.slice(7) : '';
}

export function parseCookies(request) {
  const raw = request.headers.get('cookie') || '';
  const result = {};
  raw.split(';').forEach((part) => {
    const [name, ...rest] = part.trim().split('=');
    if (!name) return;
    result[name] = decodeURIComponent(rest.join('='));
  });
  return result;
}

export function getAdminCookieValue(request) {
  const cookies = parseCookies(request);
  return cookies[ADMIN_COOKIE] || '';
}

export function buildAdminSessionCookie(value, maxAge = 60 * 60 * 12) {
  return `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearAdminSessionCookie() {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function isAdminAuthenticated(request, env) {
  if (!env.ADMIN_KEY) return true;
  const token = parseAuth(request);
  if (token && token === env.ADMIN_KEY) return true;
  const cookieToken = getAdminCookieValue(request);
  return !!cookieToken && cookieToken === env.ADMIN_KEY;
}

export function requireAdmin(request, env) {
  if (isAdminAuthenticated(request, env)) return { ok: true };
  return { ok: false };
}

export function sanitizeText(value, fallback = '') {
  return String(value ?? fallback).trim();
}

export function normalizeBool(value) {
  return String(value).toLowerCase() === 'true' || value === true || value === '1' ? 1 : 0;
}

export async function ensureSiteProfileTable(env) {
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hero_title TEXT NOT NULL DEFAULT '',
      hero_subtitle TEXT NOT NULL DEFAULT '',
      about_title TEXT NOT NULL DEFAULT '',
      artist_intro TEXT NOT NULL DEFAULT '',
      awards_text TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      contact_instagram TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    )
  `).run();

  const columns = await env.DB.prepare(`PRAGMA table_info(site_profile)`).all();
  const existingColumns = new Set((columns.results || []).map((col) => col.name));

  const requiredColumns = [
    ['hero_title', "TEXT NOT NULL DEFAULT ''"],
    ['hero_subtitle', "TEXT NOT NULL DEFAULT ''"],
    ['about_title', "TEXT NOT NULL DEFAULT ''"],
    ['artist_intro', "TEXT NOT NULL DEFAULT ''"],
    ['awards_text', "TEXT NOT NULL DEFAULT ''"],
    ['contact_email', "TEXT NOT NULL DEFAULT ''"],
    ['contact_instagram', "TEXT NOT NULL DEFAULT ''"],
  ];

  for (const [name, type] of requiredColumns) {
    if (!existingColumns.has(name)) {
      await env.DB.prepare(`ALTER TABLE site_profile ADD COLUMN ${name} ${type}`).run();
    }
  }

  const existing = await env.DB.prepare(`SELECT id FROM site_profile WHERE id = 1`).first();
  if (!existing) {
    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO site_profile (id, hero_title, hero_subtitle, about_title, artist_intro, awards_text, contact_email, contact_instagram, updated_at)
      VALUES (1, '', '', '', '', '', '', '', ?1)
    `).bind(now).run();
  }
}
