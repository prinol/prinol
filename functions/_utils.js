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
