import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import http from 'node:http';
import { chromium } from '@playwright/test';
import { playwrightRenderer, type NetworkPolicy } from '../lib/server/render';

// These tests start a real headless browser against a local server, so they
// are skipped on a machine where the browser has not been installed
// (npx playwright install chromium).
const hasBrowser = existsSync(chromium.executablePath());

function startServer() {
  const hits: string[] = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url ?? '');
    const url = req.url ?? '';
    const port = (server.address() as { port: number }).port;
    if (url === '/ok') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(
        '<html><body><a href="/jobs/1"><b>Applied AI Engineer</b></a><script src="/app.js"></script></body></html>',
      );
    } else if (url === '/hop') {
      res.writeHead(302, { location: '/ok' });
      res.end();
    } else if (url === '/to-private') {
      res.writeHead(302, { location: '/private' });
      res.end();
    } else if (url === '/to-other-site') {
      res.writeHead(302, { location: `http://localhost:${port}/ok` });
      res.end();
    } else if (url === '/script-redirect') {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(
        '<html><body>hello<script src="/to-private"></script></body></html>',
      );
    } else if (url === '/app.js') {
      res.writeHead(200, { 'content-type': 'text/javascript' });
      res.end('document.title = "ran";');
    } else {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end('<html><body>private data</body></html>');
    }
  });
  return new Promise<{
    base: string;
    port: number;
    hits: string[];
    close: () => void;
  }>((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port;
      resolve({
        base: `http://127.0.0.1:${port}`,
        port,
        hits,
        close: () => server.close(),
      });
    }),
  );
}
const policyFor = (port: number): NetworkPolicy => ({
  start: (raw) => new URL(raw),
  // Local test server only, and never the "private" path.
  allows: async (url) =>
    ['127.0.0.1', 'localhost'].includes(url.hostname) &&
    url.port === String(port) &&
    url.pathname !== '/private',
});

test(
  'a page is rendered and a redirect to an allowed address is followed',
  { skip: !hasBrowser, timeout: 60_000 },
  async () => {
    const server = await startServer();
    try {
      const render = (await playwrightRenderer({
        policy: policyFor(server.port),
      }))!;
      const out = await render(`${server.base}/hop`);
      assert.match(out.html, /Applied AI Engineer/);
    } finally {
      server.close();
    }
  },
);

test(
  'a redirect to a disallowed address is never requested',
  { skip: !hasBrowser, timeout: 60_000 },
  async () => {
    const server = await startServer();
    try {
      const render = (await playwrightRenderer({
        policy: policyFor(server.port),
      }))!;
      await assert.rejects(() => render(`${server.base}/to-private`));
      assert.ok(!server.hits.includes('/private'), server.hits.join(','));
    } finally {
      server.close();
    }
  },
);

test(
  'a script or subresource redirected to a disallowed address is never requested',
  { skip: !hasBrowser, timeout: 60_000 },
  async () => {
    const server = await startServer();
    try {
      const render = (await playwrightRenderer({
        policy: policyFor(server.port),
      }))!;
      await render(`${server.base}/script-redirect`);
      assert.ok(!server.hits.includes('/private'), server.hits.join(','));
    } finally {
      server.close();
    }
  },
);

test(
  'a redirect of the page itself to another site is refused',
  { skip: !hasBrowser, timeout: 60_000 },
  async () => {
    const server = await startServer();
    try {
      const render = (await playwrightRenderer({
        policy: policyFor(server.port),
      }))!;
      await assert.rejects(() => render(`${server.base}/to-other-site`));
    } finally {
      server.close();
    }
  },
);
