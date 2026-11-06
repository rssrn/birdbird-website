/**
 * birdbird site Worker.
 *
 * Serves /media/* from the R2 bucket (binding MEDIA) on the site's own origin,
 * replacing the rate-limited r2.dev public URL. Everything else falls through
 * to the static assets in ./dist.
 *
 * @author Claude Opus 5.5 Anthropic
 */

const MEDIA_PREFIX = '/media/';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith(MEDIA_PREFIX)) {
      return serveMedia(request, env, decodeURIComponent(url.pathname.slice(MEDIA_PREFIX.length)));
    }
    return env.ASSETS.fetch(request);
  },
};

/**
 * Serve one R2 object, honouring Range and conditional (ETag) requests so
 * video seeking/streaming works and browsers can revalidate cheaply.
 *
 * @author Claude Opus 5.5 Anthropic
 */
async function serveMedia(request, env, key) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }
  if (!key || key.includes('..')) {
    return new Response('Not Found', { status: 404 });
  }

  if (request.method === 'HEAD') {
    const head = await env.MEDIA.head(key);
    if (!head) return new Response(null, { status: 404 });
    const headers = buildHeaders(head, key);
    headers.set('Content-Length', String(head.size));
    return new Response(null, { status: 200, headers });
  }

  const object = await env.MEDIA.get(key, {
    range: request.headers,
    onlyIf: request.headers,
  });
  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const headers = buildHeaders(object, key);

  // onlyIf precondition matched (e.g. If-None-Match): R2 returns metadata without a body.
  if (!('body' in object) || !object.body) {
    return new Response(null, { status: 304, headers });
  }

  if (request.headers.has('range') && object.range) {
    const { start, end } = resolveRange(object.range, object.size);
    headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
    headers.set('Content-Length', String(end - start + 1));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set('Content-Length', String(object.size));
  return new Response(object.body, { status: 200, headers });
}

/**
 * Response headers for an R2 object: stored HTTP metadata, ETag, ranges, caching.
 * JSON (indexes/metadata) changes on republish, so keep it short; media is long-lived
 * but still revalidates via ETag.
 *
 * @author Claude Opus 5.5 Anthropic
 */
function buildHeaders(object, key) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('ETag', object.httpEtag);
  headers.set('Accept-Ranges', 'bytes');
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', guessType(key));
  }
  headers.set('Cache-Control', key.endsWith('.json') ? 'public, max-age=60' : 'public, max-age=86400');
  return headers;
}

/**
 * Convert an R2Range ({offset,length} or {suffix}) into inclusive start/end bytes.
 *
 * @author Claude Opus 5.5 Anthropic
 */
function resolveRange(range, size) {
  if ('suffix' in range && range.suffix !== undefined) {
    const start = Math.max(0, size - range.suffix);
    return { start, end: size - 1 };
  }
  const start = range.offset ?? 0;
  const length = range.length ?? size - start;
  return { start, end: Math.min(size - 1, start + length - 1) };
}

/**
 * Fallback Content-Type when the object was uploaded without one.
 *
 * @author Claude Opus 5.5 Anthropic
 */
function guessType(key) {
  const ext = key.slice(key.lastIndexOf('.') + 1).toLowerCase();
  return {
    json: 'application/json',
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  }[ext] || 'application/octet-stream';
}
