import { isAdminAuthenticated } from './_utils';

function redirectToLogin(request) {
  const url = new URL(request.url);
  const login = new URL('/admin-login.html', url.origin);
  login.searchParams.set('returnTo', `${url.pathname}${url.search}`);
  return Response.redirect(login.toString(), 302);
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname === '/admin') {
    if (!isAdminAuthenticated(request, env)) return redirectToLogin(request);
    return Response.redirect(new URL('/admin.html', url.origin).toString(), 302);
  }

  if (url.pathname === '/admin.html') {
    if (!isAdminAuthenticated(request, env)) return redirectToLogin(request);
  }

  return next();
}
