import { badRequest, buildAdminSessionCookie, clearAdminSessionCookie, isAdminAuthenticated, json, sanitizeText } from '../_utils';

export async function onRequestGet(context) {
  const { request, env } = context;
  return json({ authenticated: isAdminAuthenticated(request, env) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('암호를 입력하세요.');

  const password = sanitizeText(body.password);
  if (!password) return badRequest('암호를 입력하세요.');
  if (!env.ADMIN_KEY) return json({ error: '서버에 ADMIN_KEY가 설정되지 않았습니다.' }, { status: 500 });
  if (password !== env.ADMIN_KEY) return json({ error: '암호가 올바르지 않습니다.' }, { status: 401 });

  return json({ ok: true }, {
    headers: {
      'set-cookie': buildAdminSessionCookie(env.ADMIN_KEY),
    },
  });
}

export async function onRequestDelete() {
  return json({ ok: true }, {
    headers: {
      'set-cookie': clearAdminSessionCookie(),
    },
  });
}
