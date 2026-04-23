export async function onRequestGet(context) {
  try {
    const cookie = context.request.headers.get('cookie') || '';
    const match = cookie.match(/(?:^|;\s*)admin_session=([^;]+)/);
    const value = match ? decodeURIComponent(match[1]) : '';
    const authenticated = !!(value && context.env.ADMIN_KEY && value === context.env.ADMIN_KEY);
    return new Response(JSON.stringify({ authenticated }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  } catch {
    return new Response(JSON.stringify({ authenticated: false }), {
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
  }
}
