import { connect } from 'cloudflare:sockets';
import {
  BufferedSocketReader,
  HOP_BY_HOP_HEADERS,
  PROXY_PREFIX,
  type ParsedResponseHead,
  type ResponseBodyMode,
  concatBytes,
  findHeaderEnd,
  parseChunkSizeLine,
  parseResponseHead,
  resolveTarget,
  selectResponseBodyMode,
} from './proxy-core';

const ALLOWED_ORIGINS = new Set([
  'https://xingtu.live',
  'https://www.xingtu.live',
]);
const ALLOWED_METHODS = new Set([
  'GET',
  'HEAD',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
]);
const MAX_RESPONSE_HEADER_BYTES = 256 * 1024;
const encoder = new TextEncoder();

function getAllowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  return ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  if (!origin) return headers;
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', [...ALLOWED_METHODS].join(','));
  headers.set(
    'Access-Control-Allow-Headers',
    'Authorization,Content-Type,X-Request-Id,Accept'
  );
  headers.set(
    'Access-Control-Expose-Headers',
    'Content-Length,Content-Range,X-Oneapi-Request-Id'
  );
  headers.set('Vary', 'Origin');
  return headers;
}

function errorResponse(
  status: number,
  message: string,
  origin: string | null
): Response {
  const headers = corsHeaders(origin);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  return new Response(JSON.stringify({ error: message }), { status, headers });
}

async function readResponseHead(
  reader: ReadableStreamDefaultReader<Uint8Array>
): Promise<ParsedResponseHead> {
  let bytes = new Uint8Array();
  for (;;) {
    const result = await reader.read();
    if (result.done) throw new Error('Upstream response was empty');
    bytes = concatBytes(
      bytes,
      result.value as Uint8Array
    ) as Uint8Array<ArrayBuffer>;
    if (bytes.byteLength > MAX_RESPONSE_HEADER_BYTES) {
      throw new Error('Upstream response headers are too large');
    }
    const end = findHeaderEnd(bytes);
    if (end < 0) continue;

    return parseResponseHead(bytes, end);
  }
}

function createResponseBodyStream(
  bodyReader: BufferedSocketReader,
  closeSocket: () => Promise<void>,
  mode: ResponseBodyMode,
  contentLength = 0
): ReadableStream<Uint8Array> | null {
  if (mode === 'none') return null;

  let remaining = contentLength;
  let chunkRemaining = 0;
  let chunkFinished = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (mode === 'length') {
          if (remaining <= 0) {
            controller.close();
            await closeSocket();
            return;
          }
          const chunk = await bodyReader.readAtMost(
            Math.min(remaining, 64 * 1024)
          );
          if (!chunk) throw new Error('Upstream response ended early');
          remaining -= chunk.byteLength;
          controller.enqueue(chunk);
          return;
        }

        if (mode === 'chunked') {
          if (chunkFinished) {
            controller.close();
            await closeSocket();
            return;
          }
          if (chunkRemaining === 0) {
            const line = await bodyReader.readLine();
            const size = parseChunkSizeLine(line);
            if (size === 0) {
              while ((await bodyReader.readLine()) !== '') {
                // Consume chunk trailers.
              }
              chunkFinished = true;
              controller.close();
              await closeSocket();
              return;
            }
            chunkRemaining = size;
          }
          const chunk = await bodyReader.readAtMost(
            Math.min(chunkRemaining, 64 * 1024)
          );
          if (!chunk) throw new Error('Upstream chunked response ended early');
          chunkRemaining -= chunk.byteLength;
          if (chunkRemaining === 0) {
            const terminator = await bodyReader.readExactly(2);
            if (terminator[0] !== 13 || terminator[1] !== 10) {
              throw new Error('Invalid upstream chunk terminator');
            }
          }
          controller.enqueue(chunk);
          return;
        }

        const chunk = await bodyReader.readChunk();
        if (!chunk) {
          controller.close();
          await closeSocket();
          return;
        }
        controller.enqueue(chunk);
      } catch (error) {
        controller.error(error);
        await closeSocket();
      }
    },
    async cancel() {
      await closeSocket();
    },
  });
}

function buildResponseHeaders(
  upstreamHeaders: Headers,
  origin: string | null,
  mode: ResponseBodyMode,
  contentLength: number
): Headers {
  const headers = new Headers();
  for (const [name, value] of upstreamHeaders) {
    if (HOP_BY_HOP_HEADERS.has(name.toLowerCase())) continue;
    if (name.toLowerCase() === 'content-length' && mode !== 'length') continue;
    if (name.toLowerCase() === 'content-encoding') continue;
    if (name.toLowerCase() === 'set-cookie') continue;
    headers.append(name, value);
  }
  if (mode === 'length') headers.set('Content-Length', String(contentLength));
  headers.set('Cache-Control', 'no-store');
  for (const [name, value] of corsHeaders(origin)) headers.set(name, value);
  return headers;
}

async function proxyOverSocket(
  request: Request,
  target: URL,
  origin: string | null
): Promise<Response> {
  const socket = connect(
    { hostname: target.hostname, port: 443 },
    { secureTransport: 'on', allowHalfOpen: false }
  );
  let socketClosed = false;

  async function closeSocket(): Promise<void> {
    if (socketClosed) return;
    socketClosed = true;
    request.signal.removeEventListener('abort', abortSocket);
    try {
      await socket.close();
    } catch {
      // Cleanup must not replace the upstream outcome.
    }
  }

  function abortSocket(): void {
    void closeSocket();
  }

  request.signal.addEventListener('abort', abortSocket, { once: true });
  if (request.signal.aborted) abortSocket();

  try {
    await socket.opened;
    if (request.signal.aborted) {
      throw new Error('Client canceled the proxy request');
    }

    const headers = new Headers(request.headers);
    for (const name of [
      'host',
      'origin',
      'referer',
      'cookie',
      'content-length',
      'content-encoding',
      'connection',
      'transfer-encoding',
      'accept-encoding',
    ]) {
      headers.delete(name);
    }
    for (const name of [...headers.keys()]) {
      if (
        name.startsWith('cf-') ||
        name.startsWith('x-forwarded-') ||
        ['forwarded', 'true-client-ip', 'x-real-ip'].includes(name)
      ) {
        headers.delete(name);
      }
    }
    headers.set('Host', target.hostname);
    headers.set('Connection', 'close');
    headers.set('Accept-Encoding', 'identity');

    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const hasRequestBody = hasBody && Boolean(request.body);
    const declaredLength = request.headers.get('content-length');
    if (hasRequestBody && declaredLength) {
      headers.set('Content-Length', declaredLength);
    } else if (hasRequestBody) {
      headers.set('Transfer-Encoding', 'chunked');
    } else if (hasBody) {
      headers.set('Content-Length', '0');
    }

    const requestLines = [
      `${request.method} ${target.pathname}${target.search} HTTP/1.1`,
      ...[...headers].map(([name, value]) => `${name}: ${value}`),
      '',
      '',
    ];
    const writer = socket.writable.getWriter();
    await writer.write(encoder.encode(requestLines.join('\r\n')));

    if (hasRequestBody) {
      const reader = request.body!.getReader();
      try {
        for (;;) {
          const part = await reader.read();
          if (part.done) break;
          if (declaredLength) {
            await writer.write(part.value);
          } else {
            await writer.write(
              encoder.encode(`${part.value.byteLength.toString(16)}\r\n`)
            );
            await writer.write(part.value);
            await writer.write(encoder.encode('\r\n'));
          }
        }
      } finally {
        reader.releaseLock();
      }
      if (!declaredLength) await writer.write(encoder.encode('0\r\n\r\n'));
    }
    writer.releaseLock();

    const socketReader = socket.readable.getReader();
    const head = await readResponseHead(socketReader);
    const contentLengthHeader = head.headers.get('content-length');
    const { mode, contentLength } = selectResponseBodyMode(
      request.method,
      head.status,
      head.transferEncoding,
      contentLengthHeader
    );

    const bodyReader = new BufferedSocketReader(socketReader, head.remainder);
    const body = createResponseBodyStream(
      bodyReader,
      closeSocket,
      mode,
      contentLength
    );
    const response = new Response(body, {
      status: head.status,
      statusText: head.statusText,
      headers: buildResponseHeaders(head.headers, origin, mode, contentLength),
    });
    if (mode === 'none') {
      socketReader.releaseLock();
      await closeSocket();
    }
    return response;
  } catch (error) {
    await closeSocket();
    throw error;
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const requestUrl = new URL(request.url);
    const originHeader = request.headers.get('Origin');
    const origin = getAllowedOrigin(request);

    if (originHeader && !origin) {
      return errorResponse(403, 'Origin is not allowed', null);
    }

    if (!requestUrl.pathname.startsWith(PROXY_PREFIX)) {
      return fetch(request);
    }

    if (!ALLOWED_METHODS.has(request.method)) {
      return errorResponse(405, 'Method is not allowed', origin);
    }

    if (request.method === 'OPTIONS') {
      const headers = corsHeaders(origin);
      headers.set('Access-Control-Max-Age', '600');
      return new Response(null, { status: 204, headers });
    }

    const target = resolveTarget(requestUrl);
    if (!target) {
      return errorResponse(404, 'Upstream path is not allowed', origin);
    }

    try {
      return await proxyOverSocket(request, target, origin);
    } catch {
      return errorResponse(502, 'Upstream request failed', origin);
    }
  },
} satisfies ExportedHandler;
