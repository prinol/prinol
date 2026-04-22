function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function unauthorized(message = 'Unauthorized') {
  return json({ error: message }, { status: 401 });
}

function badRequest(message = 'Bad request') {
  return json({ error: message }, { status: 400 });
}

function serverError(message = 'Server error', detail = '') {
  return json({ error: message, detail }, { status: 500 });
}

function getCookie(request, name) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function createSessionCookie(password) {
  const secure = 'Secure; ';
  return `admin_session=${encodeURIComponent(password)}; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=604800`;
}

function clearSessionCookie() {
  const secure = 'Secure; ';
  return `admin_session=; Path=/; HttpOnly; SameSite=Lax; ${secure}Max-Age=0`;
}

function isAuthorized(request, env) {
  const token = getCookie(request, 'admin_session');
  return !!env.ADMIN_KEY && token === env.ADMIN_KEY;
}

async function columnExists(env, tableName, columnName) {
  const rows = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all();
  return (rows.results || []).some((row) => row.name === columnName);
}

async function addColumnIfMissing(env, tableName, definition) {
  const name = definition.trim().split(/\s+/)[0];
  if (!(await columnExists(env, tableName, name))) {
    await env.DB.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${definition}`).run();
  }
}

async function ensureSchema(env) {
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS artworks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      year TEXT,
      category TEXT,
      tags TEXT,
      image_key TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_artworks_created_at ON artworks(created_at DESC)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_artworks_public ON artworks(is_public)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS site_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hero_title TEXT NOT NULL DEFAULT 'PRINOL',
      hero_subtitle TEXT NOT NULL DEFAULT 'Personal Artwork Portfolio',
      about_title TEXT NOT NULL DEFAULT '작가 소개',
      about_body TEXT NOT NULL DEFAULT '작가 소개 문장을 입력하세요.',
      awards_text TEXT NOT NULL DEFAULT '',
      contact_email TEXT NOT NULL DEFAULT '',
      contact_instagram TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`),
  ]);

  // Migrate older profile tables created by previous versions.
  await addColumnIfMissing(env, 'site_profile', `hero_title TEXT NOT NULL DEFAULT 'PRINOL'`);
  await addColumnIfMissing(env, 'site_profile', `hero_subtitle TEXT NOT NULL DEFAULT 'Personal Artwork Portfolio'`);
  await addColumnIfMissing(env, 'site_profile', `about_title TEXT NOT NULL DEFAULT '작가 소개'`);
  await addColumnIfMissing(env, 'site_profile', `about_body TEXT NOT NULL DEFAULT '작가 소개 문장을 입력하세요.'`);
  await addColumnIfMissing(env, 'site_profile', `awards_text TEXT NOT NULL DEFAULT ''`);
  await addColumnIfMissing(env, 'site_profile', `contact_email TEXT NOT NULL DEFAULT ''`);
  await addColumnIfMissing(env, 'site_profile', `contact_instagram TEXT NOT NULL DEFAULT ''`);
  await addColumnIfMissing(env, 'site_profile', `updated_at TEXT NOT NULL DEFAULT ''`);

  await env.DB.prepare(`
    INSERT OR IGNORE INTO site_profile (
      id, hero_title, hero_subtitle, about_title, about_body, awards_text, contact_email, contact_instagram, updated_at
    ) VALUES (
      1, 'PRINOL', 'Personal Artwork Portfolio', '작가 소개', '작가 소개 문장을 입력하세요.', '', '', '', strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    )
  `).run();
}

function fileExtension(filename = '') {
  const part = filename.toLowerCase().split('.').pop();
  return /^[a-z0-9]+$/.test(part) ? part : 'jpg';
}

function makeImageUrl(request, imageKey) {
  const url = new URL(request.url);
  return `${url.origin}/images/${encodeURIComponent(imageKey)}`;
}

function uuid() {
  return crypto.randomUUID();
}

export {
  json,
  unauthorized,
  badRequest,
  serverError,
  getCookie,
  createSessionCookie,
  clearSessionCookie,
  isAuthorized,
  ensureSchema,
  fileExtension,
  makeImageUrl,
  uuid
};
