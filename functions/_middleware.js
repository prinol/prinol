export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  const protectedPages = new Set([
    '/admin.html',
    '/admin-profile.html',
    '/admin-new.html',
    '/admin-manage.html',
  ]);

  const protectedApiPrefixes = ['/api/upload', '/api/update', '/api/delete', '/api/profile'];

  const requiresPageAuth = protectedPages.has(pathname);
  const requiresApiAuth = protectedApiPrefixes.some(prefix => pathname.startsWith(prefix)) && request.method !== 'GET';

  if (!requiresPageAuth && !requiresApiAuth) {
    return next();
  }

  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(/(?:^|;\s*)admin_session=([^;]+)/);
  const sessionValue = match ? decodeURIComponent(match[1]) : '';

  const valid = sessionValue && context.env.ADMIN_KEY && sessionValue === context.env.ADMIN_KEY;

  if (valid) {
    return next();
  }

  if (requiresPageAuth) {
    return Response.redirect(`${url.origin}/admin-login.html`, 302);
  }

  return Response.json({ error: '인증이 필요합니다.' }, { status: 401 });
}
