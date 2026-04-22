import { isAdminAuthenticated } from './_utils';

function html(body) {
  return new Response(body, {
    headers: {
      'content-type': 'text/html; charset=UTF-8',
      'cache-control': 'no-store',
    },
  });
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!isAdminAuthenticated(request, env)) {
    const login = new URL('/admin-login.html', url.origin);
    login.searchParams.set('returnTo', '/admin');
    return Response.redirect(login.toString(), 302);
  }

  // Serve the static admin page content through the protected /admin route.
  const adminUrl = new URL('/admin.html', url.origin);
  const adminRequest = new Request(adminUrl.toString(), request);
  const response = await env.ASSETS.fetch(adminRequest);
  const body = await response.text();
  return html(body);
}
