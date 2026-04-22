export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);

    // /images/ 뒤 전체 경로를 그대로 key로 사용
    const key = decodeURIComponent(url.pathname.replace(/^\/images\//, ''));

    if (!key) {
      return new Response('Not Found', { status: 404 });
    }

    const object = await env.ART_BUCKET.get(key);
    if (!object) {
      return new Response('Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('cache-control', 'public, max-age=31536000, immutable');

    return new Response(object.body, { headers });
  } catch (err) {
    return new Response(err?.message || 'Image read failed', { status: 500 });
  }
}
