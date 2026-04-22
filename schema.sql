CREATE TABLE IF NOT EXISTS artworks (
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
);

CREATE INDEX IF NOT EXISTS idx_artworks_created_at ON artworks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_artworks_public ON artworks(is_public);

CREATE TABLE IF NOT EXISTS site_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  hero_title TEXT NOT NULL DEFAULT 'PRINOL',
  hero_subtitle TEXT NOT NULL DEFAULT 'Personal Artwork Portfolio',
  about_title TEXT NOT NULL DEFAULT '작가 소개',
  about_body TEXT NOT NULL DEFAULT '작가 소개 문장을 입력하세요.',
  awards_text TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  contact_instagram TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

INSERT OR IGNORE INTO site_profile (
  id, hero_title, hero_subtitle, about_title, about_body, awards_text, contact_email, contact_instagram
) VALUES (
  1,
  'PRINOL',
  'Personal Artwork Portfolio',
  '작가 소개',
  '작가 소개 문장을 입력하세요.',
  '',
  '',
  ''
);
