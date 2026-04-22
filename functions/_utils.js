export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

export function badRequest(message = "잘못된 요청입니다.") {
  return json({ error: message }, { status: 400 });
}

export function uuid() {
  return crypto.randomUUID();
}

export function fileExtension(filename = "") {
  const clean = String(filename).trim();
  const idx = clean.lastIndexOf(".");
  if (idx === -1) return "";
  return clean.slice(idx).toLowerCase();
}

export function makeImageUrl(requestOrOrigin, imageKey = "") {
  const origin =
    typeof requestOrOrigin === "string"
      ? requestOrOrigin
      : new URL(requestOrOrigin.url).origin;
  return `${origin}/images/${encodeURIComponent(imageKey)}`;
}

export function createSessionCookie(value) {
  const encoded = encodeURIComponent(String(value || ""));
  return `admin_session=${encoded}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=604800`;
}

export function clearSessionCookie() {
  return "admin_session=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0";
}

async function ensureColumn(DB, existingNames, name, sql) {
  if (!existingNames.has(name)) {
    await DB.prepare(sql).run();
    existingNames.add(name);
  }
}

export async function ensureSchema(DB) {
  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS artworks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      year TEXT DEFAULT '',
      category TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      image_key TEXT NOT NULL,
      is_public INTEGER NOT NULL DEFAULT 1,
      is_pinned INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const columns = await DB.prepare(`PRAGMA table_info(artworks)`).all();
  const names = new Set((columns?.results || []).map((col) => col.name));

  await ensureColumn(DB, names, "description", "ALTER TABLE artworks ADD COLUMN description TEXT DEFAULT ''");
  await ensureColumn(DB, names, "year", "ALTER TABLE artworks ADD COLUMN year TEXT DEFAULT ''");
  await ensureColumn(DB, names, "category", "ALTER TABLE artworks ADD COLUMN category TEXT DEFAULT ''");
  await ensureColumn(DB, names, "tags", "ALTER TABLE artworks ADD COLUMN tags TEXT DEFAULT ''");
  await ensureColumn(DB, names, "image_key", "ALTER TABLE artworks ADD COLUMN image_key TEXT DEFAULT ''");
  await ensureColumn(DB, names, "is_public", "ALTER TABLE artworks ADD COLUMN is_public INTEGER NOT NULL DEFAULT 1");
  await ensureColumn(DB, names, "is_pinned", "ALTER TABLE artworks ADD COLUMN is_pinned INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(DB, names, "created_at", "ALTER TABLE artworks ADD COLUMN created_at TEXT");
  await ensureColumn(DB, names, "updated_at", "ALTER TABLE artworks ADD COLUMN updated_at TEXT");

  await DB.prepare(`
    UPDATE artworks
    SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP),
        is_pinned = COALESCE(is_pinned, 0)
    WHERE created_at IS NULL OR updated_at IS NULL OR is_pinned IS NULL
  `).run();

  await DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_artworks_created_at
    ON artworks(created_at DESC)
  `).run();

  await DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_artworks_public
    ON artworks(is_public)
  `).run();

  await DB.prepare(`
    CREATE INDEX IF NOT EXISTS idx_artworks_pinned
    ON artworks(is_pinned)
  `).run();
}

export async function ensureSiteProfileTable(DB) {
  await DB.prepare(`
    CREATE TABLE IF NOT EXISTS site_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      hero_title TEXT DEFAULT '',
      hero_subtitle TEXT DEFAULT '',
      about_title TEXT DEFAULT '',
      about_body TEXT DEFAULT '',
      awards_text TEXT DEFAULT '',
      email TEXT DEFAULT '',
      instagram_url TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const columns = await DB.prepare(`PRAGMA table_info(site_profile)`).all();
  const names = new Set((columns?.results || []).map((col) => col.name));

  await ensureColumn(DB, names, "hero_title", "ALTER TABLE site_profile ADD COLUMN hero_title TEXT DEFAULT ''");
  await ensureColumn(DB, names, "hero_subtitle", "ALTER TABLE site_profile ADD COLUMN hero_subtitle TEXT DEFAULT ''");
  await ensureColumn(DB, names, "about_title", "ALTER TABLE site_profile ADD COLUMN about_title TEXT DEFAULT ''");
  await ensureColumn(DB, names, "about_body", "ALTER TABLE site_profile ADD COLUMN about_body TEXT DEFAULT ''");
  await ensureColumn(DB, names, "awards_text", "ALTER TABLE site_profile ADD COLUMN awards_text TEXT DEFAULT ''");
  await ensureColumn(DB, names, "email", "ALTER TABLE site_profile ADD COLUMN email TEXT DEFAULT ''");
  await ensureColumn(DB, names, "instagram_url", "ALTER TABLE site_profile ADD COLUMN instagram_url TEXT DEFAULT ''");
  await ensureColumn(DB, names, "created_at", "ALTER TABLE site_profile ADD COLUMN created_at TEXT");
  await ensureColumn(DB, names, "updated_at", "ALTER TABLE site_profile ADD COLUMN updated_at TEXT");

  await DB.prepare(`
    INSERT INTO site_profile (
      id, hero_title, hero_subtitle, about_title, about_body, awards_text, email, instagram_url, created_at, updated_at
    )
    SELECT 1, '', '', '', '', '', '', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM site_profile WHERE id = 1)
  `).run();

  await DB.prepare(`
    UPDATE site_profile
    SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
        updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
    WHERE id = 1
  `).run();
}
