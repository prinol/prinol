function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

function parseCookies(request) {
  const raw = request.headers.get('cookie') || '';
  const cookies = {};
  for (const part of raw.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    cookies[k] = decodeURIComponent(rest.join('='));
  }
  return cookies;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json().catch(() => null);
  const password = body?.password || '';
  const valid = env.ADMIN_KEY || '';

  if (!valid || password !== valid) {
    return json({ ok: false, error: 'Invalid password' }, { status: 401 });
  }

  return json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': 'admin_auth=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=43200',
      },
    }
  );
}

export async function onRequestDelete() {
  return json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': 'admin_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
      },
    }
  );
}

export async function onRequestGet(context) {
  const cookies = parseCookies(context.request);
  return json({ ok: cookies.admin_auth === '1' });
}
