import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  publicAddress,
  resolveDestination,
  createPageReader,
} from '../lib/server/sources';
test('unsafe schemes, hosts and IP ranges are rejected before transport', async () => {
  for (const address of [
    '127.0.0.1',
    '10.0.0.1',
    '169.254.169.254',
    '192.168.0.1',
    '172.16.0.1',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    '0.0.0.0',
  ])
    assert.equal(publicAddress(address), false, address);
  for (const url of [
    'http://example.com',
    'https://localhost',
    'https://user:pass@example.com',
    'https://example.com:3000',
  ])
    await assert.rejects(resolveDestination(url));
  await assert.rejects(
    resolveDestination('https://example.com', async () => [
      { address: '8.8.8.8', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ]),
  );
});
test('redirect to a private address is blocked even after a safe initial request', async () => {
  const visited: string[] = [];
  const read = createPageReader(
    async (hostname) => [
      {
        address: hostname === 'safe.example' ? '8.8.8.8' : '127.0.0.1',
        family: 4,
      },
    ],
    async (destination) => {
      visited.push(destination.url.hostname);
      return {
        body: '',
        status: 302,
        type: 'text/html',
        location: 'https://internal.example/secret',
      };
    },
  );
  await assert.rejects(read('https://safe.example'));
  assert.deepEqual(visited, ['safe.example']);
});
