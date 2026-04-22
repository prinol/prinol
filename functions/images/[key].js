export async function onRequestGet(context) {
  const { env, params } = context;
  const key = params.key;
  if (!key) return new Response('Not found', { status: 404 });

  const object = await env.ART_BUCKET.get(key);
  if (!object) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
}
