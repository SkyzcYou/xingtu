export const UPSTREAMS = {
  api: 'https://api.tu-zi.com',
  apicdn: 'https://apicdn.tu-zi.com',
  apius: 'https://apius.tu-zi.com',
} as const;

export type UpstreamAlias = keyof typeof UPSTREAMS;

export const PROXY_PREFIX = '/__tuzi_proxy__/';

const ALLOWED_PATH_PREFIXES = [
  '/api',
  '/oauth',
  '/v1',
  '/v1beta',
  '/v2',
  '/pg',
  '/async',
  '/mj',
  '/suno',
  '/kling',
  '/jimeng',
  '/fapiao',
  '/integration',
  '/mrmgr',
  '/fast',
  '/relax',
  '/turbo',
  '/default',
  '/async-results',
  '/local-async-image-requests',
  '/task-images',
  '/image-cache',
  '/log/get-request',
  '/internal/image-origin/health',
  '/get-async',
  '/livez',
  '/readyz',
] as const;

export const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const decoder = new TextDecoder();
const MAX_RESPONSE_LINE_BYTES = 16 * 1024;

export type ResponseBodyMode = 'none' | 'length' | 'chunked' | 'close';

export interface ParsedResponseHead {
  status: number;
  statusText: string;
  headers: Headers;
  transferEncoding: string;
  remainder: Uint8Array;
}

export function resolveTarget(requestUrl: URL): URL | null {
  if (!requestUrl.pathname.startsWith(PROXY_PREFIX)) return null;

  const relativePath = requestUrl.pathname.slice(PROXY_PREFIX.length);
  if (!relativePath || /%2f|%5c|%2e/i.test(relativePath)) return null;

  const [alias, ...pathParts] = relativePath.split('/');
  if (!alias || !(alias in UPSTREAMS)) return null;

  const path = `/${pathParts.join('/')}`;
  if (
    !ALLOWED_PATH_PREFIXES.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`)
    )
  ) {
    return null;
  }

  const target = new URL(UPSTREAMS[alias as UpstreamAlias]);
  target.pathname = path;
  target.search = requestUrl.search;
  return target;
}

export function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  const result = new Uint8Array(left.byteLength + right.byteLength);
  result.set(left, 0);
  result.set(right, left.byteLength);
  return result;
}

export function findHeaderEnd(bytes: Uint8Array): number {
  for (let index = 0; index <= bytes.length - 4; index += 1) {
    if (
      bytes[index] === 13 &&
      bytes[index + 1] === 10 &&
      bytes[index + 2] === 13 &&
      bytes[index + 3] === 10
    ) {
      return index;
    }
  }
  return -1;
}

export class BufferedSocketReader {
  private buffered: Uint8Array;
  private readonly reader: ReadableStreamDefaultReader<Uint8Array>;

  constructor(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    initial: Uint8Array
  ) {
    this.reader = reader;
    this.buffered = initial;
  }

  async readChunk(): Promise<Uint8Array | null> {
    if (this.buffered.byteLength > 0) {
      const value = this.buffered;
      this.buffered = new Uint8Array();
      return value;
    }
    const result = await this.reader.read();
    return result.done ? null : result.value;
  }

  async readAtMost(maxBytes: number): Promise<Uint8Array | null> {
    const chunk = await this.readChunk();
    if (!chunk || chunk.byteLength <= maxBytes) return chunk;
    this.buffered = chunk.slice(maxBytes);
    return chunk.slice(0, maxBytes);
  }

  async readExactly(byteCount: number): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    let remaining = byteCount;
    while (remaining > 0) {
      const chunk = await this.readAtMost(remaining);
      if (!chunk) throw new Error('Upstream response ended early');
      chunks.push(chunk);
      remaining -= chunk.byteLength;
    }
    const result = new Uint8Array(byteCount);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  async readLine(): Promise<string> {
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const chunk = await this.readAtMost(1024);
      if (!chunk)
        throw new Error('Upstream response ended while reading a line');
      chunks.push(chunk);
      total += chunk.byteLength;
      const combined = new Uint8Array(total);
      let offset = 0;
      for (const part of chunks) {
        combined.set(part, offset);
        offset += part.byteLength;
      }
      for (let index = 0; index <= combined.length - 2; index += 1) {
        if (combined[index] === 13 && combined[index + 1] === 10) {
          if (index > MAX_RESPONSE_LINE_BYTES) {
            throw new Error('Upstream response line is too large');
          }
          const line = decoder.decode(combined.slice(0, index));
          this.buffered = concatBytes(combined.slice(index + 2), this.buffered);
          return line;
        }
      }
      if (total > MAX_RESPONSE_LINE_BYTES + 2) {
        throw new Error('Upstream response line is too large');
      }
    }
  }
}

export function parseResponseHead(
  bytes: Uint8Array,
  headerEnd: number
): ParsedResponseHead {
  const head = decoder.decode(bytes.slice(0, headerEnd));
  const lines = head.split('\r\n');
  const statusLine = lines.shift() || '';
  const statusMatch = statusLine.match(
    /^HTTP\/\d(?:\.\d)?\s+(\d{3})(?:\s+(.*))?$/i
  );
  const status = statusMatch ? Number(statusMatch[1]) : Number.NaN;
  if (!Number.isInteger(status) || status < 100 || status > 599) {
    throw new Error('Invalid upstream status line');
  }

  const headers = new Headers();
  const transferEncodings: string[] = [];
  for (const line of lines) {
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    const name = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    const lowerName = name.toLowerCase();
    if (lowerName === 'transfer-encoding') {
      transferEncodings.push(value);
    }
    if (!HOP_BY_HOP_HEADERS.has(lowerName)) {
      headers.append(name, value);
    }
  }

  return {
    status,
    statusText: statusMatch?.[2] || '',
    headers,
    transferEncoding: transferEncodings.join(','),
    remainder: bytes.slice(headerEnd + 4),
  };
}

export function selectResponseBodyMode(
  requestMethod: string,
  status: number,
  transferEncoding: string,
  contentLengthHeader: string | null
): { mode: ResponseBodyMode; contentLength: number } {
  const statusHasNoBody =
    (status >= 100 && status < 200) || [204, 205, 304].includes(status);
  if (requestMethod.toUpperCase() === 'HEAD' || statusHasNoBody) {
    return { mode: 'none', contentLength: 0 };
  }

  const transferCodings = transferEncoding
    .split(',')
    .map((coding) => coding.trim().toLowerCase())
    .filter(Boolean);
  if (transferCodings.includes('chunked')) {
    return { mode: 'chunked', contentLength: 0 };
  }

  if (contentLengthHeader && /^\d+$/.test(contentLengthHeader.trim())) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isSafeInteger(contentLength) && contentLength >= 0) {
      return { mode: 'length', contentLength };
    }
  }

  return { mode: 'close', contentLength: 0 };
}

export function parseChunkSizeLine(line: string): number {
  const sizeToken = line.split(';', 1)[0].trim();
  if (!/^[0-9a-f]+$/i.test(sizeToken)) {
    throw new Error('Invalid upstream chunk size');
  }

  const size = Number.parseInt(sizeToken, 16);
  if (!Number.isSafeInteger(size) || size < 0) {
    throw new Error('Invalid upstream chunk size');
  }
  return size;
}
