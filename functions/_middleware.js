import { isAdminAuthenticated } from './_utils';

function redirectToLogin(request) {
  const url = new URL(request.url);
  const login = new URL('/admin-login.html', url.origin);
  login.searchParams.set('returnTo', '/admin');
  return Response.redirect(login.toString(), 302);
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // Never protect the login page or auth endpoints here.
  if (
    path === '/admin-login.html' ||
    path === '/login.js' ||
    path === '/styles.css' ||
    path.startsWith('/api/auth')
  ) {
    return next();
  }

  // Use /admin as the single canonical admin entrypoint.
  if (path === '/admin.html') {
    return Response.redirect(new URL('/admin', url.origin).toString(), 302);
  }

  if (path === '/admin') {
    if (!isAdminAuthenticated(request, env)) return redirectToLogin(request);
  }

  return next();
}
