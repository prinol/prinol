import { json, badRequest, createSessionCookie, clearSessionCookie } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_KEY) {
    return json({ error: 'ADMIN_KEY is not configured.' }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== 'string') {
    return badRequest('암호를 입력하세요.');
  }
  if (body.password !== env.ADMIN_KEY) {
    return json({ error: '암호가 올바르지 않습니다.' }, { status: 401 });
  }

  return json({ ok: true }, {
    headers: {
      'Set-Cookie': createSessionCookie(env.ADMIN_KEY)
    }
  });
}

export async function onRequestDelete() {
  return json({ ok: true }, {
    headers: {
      'Set-Cookie': clearSessionCookie()
    }
  });
}
