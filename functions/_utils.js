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

export function requireAdmin(request, env) {
  if (!env.ADMIN_KEY) return { ok: true };
  const token = parseAuth(request);
  if (!token || token !== env.ADMIN_KEY) return { ok: false };
  return { ok: true };
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
      artist_intro TEXT NOT NULL DEFAULT '',
      awards_text TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      contact_instagram TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    )
  `).run();

  const existing = await env.DB.prepare(`SELECT id FROM site_profile WHERE id = 1`).first();
  if (!existing) {
    const now = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO site_profile (id, artist_intro, awards_text, contact_email, contact_instagram, updated_at)
      VALUES (1, '', '', '', '', ?1)
    `).bind(now).run();
  }
}
