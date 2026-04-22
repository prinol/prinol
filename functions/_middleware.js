import { isAuthorized } from './_utils.js';

function redirect(location, status = 302) {
  return Response.redirect(location, status);
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  const protectAdminPage = path === '/admin.html';
  const protectWriteApis = [
    '/api/upload',
    '/api/update',
    '/api/delete'
  ].includes(path) || (path === '/api/profile' && request.method !== 'GET');

  if (protectAdminPage || protectWriteApis) {
    if (!isAuthorized(request, env)) {
      if (protectAdminPage) {
        return redirect(`${url.origin}/admin-login.html`);
      }
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json; charset=utf-8' }
      });
    }
  }

  return next();
}
