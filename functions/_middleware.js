function htmlRedirect(url, status = 302) {
  return Response.redirect(url, status);
}

function jsonUnauthorized() {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

function hasValidAdminCookie(request) {
  const cookie = request.headers.get('cookie') || '';
  return /(?:^|;\s*)admin_auth=1(?:;|$)/.test(cookie);
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const authed = hasValidAdminCookie(context.request);

  const isLoginPage = path === '/admin-login.html';
  const isProtectedPage = path === '/admin.html';
  const isAuthApi = path === '/api/auth';
  const isProtectedApi = path.startsWith('/api/') && !isAuthApi;

  if (isLoginPage && authed) {
    return htmlRedirect(`${url.origin}/admin.html`);
  }

  if (isProtectedPage && !authed) {
    return htmlRedirect(`${url.origin}/admin-login.html`);
  }

  if (isProtectedApi && !authed) {
    return jsonUnauthorized();
  }

  return context.next();
}
