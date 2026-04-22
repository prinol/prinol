import { json, ensureSchema, makeImageUrl } from '../_utils.js';

function isAdminRequest(request, env) {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)admin_session=([^;]+)/);
  const value = match ? decodeURIComponent(match[1]) : '';
  return !!(value && env.ADMIN_KEY && value === env.ADMIN_KEY);
}

function toInt(value, fallback, min = 0, max = 100) {
  const n = Number.parseInt(String(value ?? ''), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const DB = env.DB;
    await ensureSchema(DB);

    const url = new URL(request.url);
    const isAdmin = isAdminRequest(request, env);

    const wantAll = url.searchParams.get('all') === '1' && isAdmin;
    const publicOnly = !wantAll;

    const limit = toInt(url.searchParams.get('limit'), 100, 1, 100);
    const offset = toInt(url.searchParams.get('offset'), 0, 0, 100000);

    const search = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const year = String(url.searchParams.get('year') || '').trim();
    const category = String(url.searchParams.get('category') || '').trim().toLowerCase();

    const where = [];
    const binds = [];

    if (publicOnly) {
      where.push('COALESCE(is_public, 1) = 1');
    }

    if (search) {
      where.push(`(
        lower(COALESCE(title, '')) LIKE ?
        OR lower(COALESCE(description, '')) LIKE ?
        OR lower(COALESCE(category, '')) LIKE ?
        OR lower(COALESCE(tags, '')) LIKE ?
      )`);
      const like = `%${search}%`;
      binds.push(like, like, like, like);
    }

    if (year) {
      where.push(`COALESCE(year, '') = ?`);
      binds.push(year);
    }

    if (category) {
      where.push(`lower(COALESCE(category, '')) = ?`);
      binds.push(category);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await DB.prepare(`
      SELECT COUNT(*) AS total
      FROM artworks
      ${whereSql}
    `).bind(...binds).first();

    const rows = await DB.prepare(`
      SELECT
        id,
        title,
        description,
        year,
        category,
        tags,
        image_key,
        is_public,
        created_at,
        updated_at
      FROM artworks
      ${whereSql}
      ORDER BY
        COALESCE(updated_at, created_at, '') DESC,
        COALESCE(created_at, '') DESC,
        id DESC
      LIMIT ? OFFSET ?
    `).bind(...binds, limit, offset).all();

    const items = (rows?.results || []).map((row) => ({
      ...row,
      is_public: Number(row.is_public ?? 1),
      image_url: makeImageUrl(request, row.image_key || ''),
    }));

    return json({
      ok: true,
      items,
      total: Number(countRow?.total || 0),
      limit,
      offset,
      publicOnly,
    });
  } catch (err) {
    return json(
      {
        error: err?.message || '작품 목록 조회에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}
