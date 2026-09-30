import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BufferedSocketReader,
  findHeaderEnd,
  parseChunkSizeLine,
  parseResponseHead,
  resolveTarget,
  selectResponseBodyMode,
} from './proxy-core.ts';

const encoder = new TextEncoder();

test('resolveTarget maps only fixed Tuzi aliases and preserves path/query', () => {
  const target = resolveTarget(
    new URL('https://xingtu.live/__tuzi_proxy__/apius/v1/models?include=images')
  );

  assert.equal(
    target?.toString(),
    'https://apius.tu-zi.com/v1/models?include=images'
  );
  assert.equal(
    resolveTarget(
      new URL('https://xingtu.live/__tuzi_proxy__/unknown/v1/models')
    ),
    null
  );
  assert.equal(
    resolveTarget(
      new URL(
        'https://xingtu.live/__tuzi_proxy__/api/https://example.com/v1/models'
      )
    ),
    null
  );
  assert.equal(
    resolveTarget(
      new URL('https://xingtu.live/__tuzi_proxy__/api/private/admin')
    ),
    null
  );
});

test('response parsing retains transfer coding metadata while stripping the hop-by-hop header', () => {
  const bytes = encoder.encode(
    'HTTP/1.1 200 OK\r\n' +
      'Content-Type: application/json\r\n' +
      'Transfer-Encoding: chunked\r\n' +
      '\r\n' +
      '4\r\ntest\r\n0\r\n\r\n'
  );
  const headerEnd = findHeaderEnd(bytes);
  const parsed = parseResponseHead(bytes, headerEnd);

  assert.equal(parsed.status, 200);
  assert.equal(parsed.statusText, 'OK');
  assert.equal(parsed.headers.get('content-type'), 'application/json');
  assert.equal(parsed.headers.get('transfer-encoding'), null);
  assert.equal(parsed.transferEncoding, 'chunked');
  assert.equal(
    new TextDecoder().decode(parsed.remainder),
    '4\r\ntest\r\n0\r\n\r\n'
  );
});

test('chunked transfer coding takes precedence over content length', () => {
  assert.deepEqual(selectResponseBodyMode('GET', 200, 'gzip, chunked', '999'), {
    mode: 'chunked',
    contentLength: 0,
  });
});

test('line reads preserve bytes buffered after the 1 KiB scan window', async () => {
  const payload = 'x'.repeat(4096);
  const initial = encoder.encode(`1000\r\n${payload}\r\n`);
  const emptyStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });
  const reader = new BufferedSocketReader(emptyStream.getReader(), initial);

  assert.equal(await reader.readLine(), '1000');
  assert.equal(
    new TextDecoder().decode(await reader.readExactly(payload.length)),
    payload
  );
  assert.deepEqual(Array.from(await reader.readExactly(2)), [13, 10]);
});

test('content-length and no-body responses select bounded modes', () => {
  assert.deepEqual(selectResponseBodyMode('GET', 200, '', '12'), {
    mode: 'length',
    contentLength: 12,
  });
  assert.deepEqual(selectResponseBodyMode('HEAD', 200, '', '12'), {
    mode: 'none',
    contentLength: 0,
  });
  assert.deepEqual(selectResponseBodyMode('GET', 205, '', '12'), {
    mode: 'none',
    contentLength: 0,
  });
  assert.deepEqual(selectResponseBodyMode('GET', 200, '', null), {
    mode: 'close',
    contentLength: 0,
  });
});

test('invalid upstream status lines are rejected', () => {
  const bytes = encoder.encode('NOT-HTTP 200 OK\r\n\r\n');
  assert.throws(
    () => parseResponseHead(bytes, findHeaderEnd(bytes)),
    /Invalid upstream status line/
  );
});

test('chunk size parsing accepts extensions and rejects partial hex tokens', () => {
  assert.equal(parseChunkSizeLine('1000;foo=bar'), 4096);
  assert.equal(parseChunkSizeLine('0'), 0);
  assert.throws(() => parseChunkSizeLine('4x'), /Invalid upstream chunk size/);
  assert.throws(() => parseChunkSizeLine(''), /Invalid upstream chunk size/);
});
