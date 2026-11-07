import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listingsFromHtml } from '../lib/server/render';

const page = 'https://www.nimbleway.com/careers';
const html = `<html><body>
<nav><a href="/careers">Careers</a><a href="/pricing">Pricing</a></nav>
<a href="/open-position?forward-deployed-engineer&uid=0D.471"><div>Forward Deployed Engineer</div><div>Sales &amp; Customer Success</div><div>San Francisco</div></a>
<a href="/open-position?pm&uid=0D.1"><div>Product manager</div><div>Product</div><div>Tel Aviv</div></a>
<a href="https://evil.example.com/jobs/1"><div>Forward Deployed Engineer</div><div>San Francisco</div></a>
<a href="#open-position-section">See all open positions</a>
<a href="/jobs/plain-title">Plain Title Only</a>
<a href="/open-position?forward-deployed-engineer&uid=0D.471"><div>Forward Deployed Engineer</div><div>Sales &amp; Customer Success</div><div>San Francisco</div></a>
</body></html>`;

test('job links on the same site become listings with a title and details', () => {
  const listings = listingsFromHtml(html, page);
  assert.deepEqual(
    listings.map((l) => [l.title, l.details, l.url]),
    [
      [
        'Forward Deployed Engineer',
        ['Sales & Customer Success', 'San Francisco'],
        'https://www.nimbleway.com/open-position?forward-deployed-engineer&uid=0D.471',
      ],
      [
        'Product manager',
        ['Product', 'Tel Aviv'],
        'https://www.nimbleway.com/open-position?pm&uid=0D.1',
      ],
      ['Plain Title Only', [], 'https://www.nimbleway.com/jobs/plain-title'],
    ],
  );
});

test('navigation, same-page anchors, other sites and repeats are not listings', () => {
  const urls = listingsFromHtml(html, page).map((l) => l.url);
  assert.ok(!urls.some((u) => u.includes('evil.example.com')));
  assert.ok(!urls.some((u) => u.endsWith('/careers')));
  assert.ok(!urls.some((u) => u.includes('#')));
  assert.equal(new Set(urls).size, urls.length);
});

test('links to a known job board system on another host are kept', () => {
  const out = listingsFromHtml(
    '<a href="https://jobs.lever.co/acme/123"><span>Applied AI Engineer</span><span>Remote</span></a>',
    'https://acme.com/careers',
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].title, 'Applied AI Engineer');
  assert.deepEqual(out[0].details, ['Remote']);
});

test('only https links are kept and the number of listings is capped', () => {
  const many = Array.from(
    { length: 400 },
    (_, i) => `<a href="/jobs/${i}"><b>Role ${i}</b></a>`,
  ).join('');
  const out = listingsFromHtml(
    many + '<a href="http://acme.com/jobs/x"><b>Insecure</b></a>',
    'https://acme.com/careers',
  );
  assert.equal(out.length, 300);
  assert.ok(!out.some((l) => l.title === 'Insecure'));
});

test('empty or script-only pages give no listings', () => {
  assert.deepEqual(
    listingsFromHtml('<html><body>Loading...</body></html>', page),
    [],
  );
});
