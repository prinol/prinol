export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
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
  const names = new Set((columns?.results || []).map(col => col.name));

  const ensureColumn = async (name, sql) => {
    if (!names.has(name)) {
      await DB.prepare(sql).run();
      names.add(name);
    }
  };

  await ensureColumn('hero_title', `ALTER TABLE site_profile ADD COLUMN hero_title TEXT DEFAULT ''`);
  await ensureColumn('hero_subtitle', `ALTER TABLE site_profile ADD COLUMN hero_subtitle TEXT DEFAULT ''`);
  await ensureColumn('about_title', `ALTER TABLE site_profile ADD COLUMN about_title TEXT DEFAULT ''`);
  await ensureColumn('about_body', `ALTER TABLE site_profile ADD COLUMN about_body TEXT DEFAULT ''`);
  await ensureColumn('awards_text', `ALTER TABLE site_profile ADD COLUMN awards_text TEXT DEFAULT ''`);
  await ensureColumn('email', `ALTER TABLE site_profile ADD COLUMN email TEXT DEFAULT ''`);
  await ensureColumn('instagram_url', `ALTER TABLE site_profile ADD COLUMN instagram_url TEXT DEFAULT ''`);
  await ensureColumn('created_at', `ALTER TABLE site_profile ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP`);
  await ensureColumn('updated_at', `ALTER TABLE site_profile ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP`);

  await DB.prepare(`
    INSERT INTO site_profile (
      id, hero_title, hero_subtitle, about_title, about_body, awards_text, email, instagram_url, created_at, updated_at
    )
    SELECT 1, '', '', '', '', '', '', '', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    WHERE NOT EXISTS (SELECT 1 FROM site_profile WHERE id = 1)
  `).run();
}
