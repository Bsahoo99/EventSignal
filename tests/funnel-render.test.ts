import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialProfile } from '../lib/profile';
import type { SearchHit } from '../lib/server/discovery';
import { researchCompanies, type FunnelDeps } from '../lib/server/funnel';
import type { Renderer } from '../lib/server/render';
import type { Resolved } from '../lib/server/resolve';
import type { SourcePage } from '../lib/server/sources';
import { createTestDependencies } from './fixtures';

const checkedAt = '2026-11-07T10:00:00.000Z';
const person: Resolved = {
  name: 'Ada Chen',
  company: 'Acme',
  title: 'Engineer',
  source: 'guest-list',
  category: 'engineer',
  evidence: { url: 'guest-list', quote: 'q', checkedAt },
};
const listing = (title: string, ...details: string[]) =>
  `<a href="/open-position?${encodeURIComponent(title)}"><div>${title}</div>${details
    .map((d) => `<div>${d}</div>`)
    .join('')}</a>`;
const html = (...items: string[]) =>
  `<html><body><nav><a href="/careers">Careers</a></nav>${items.join('')}</body></html>`;
const homeHit: SearchHit = {
  title: 'acme',
  url: 'https://acme.com/',
  description: 'site',
};

function setup(
  options: {
    render?: Renderer;
    careersReadable?: boolean;
    findSite?: boolean;
    websites?: Record<string, string>;
    locations?: string[];
    maxRenders?: number;
    careersJob?: boolean;
  } = {},
) {
  const pages = new Map<string, SourcePage>();
  if (options.findSite !== false || options.websites) {
    pages.set('https://acme.com/', {
      url: 'https://acme.com/',
      title: 'Acme',
      text: 'Acme builds agents and evaluation software for developers.',
      links: [{ label: 'Careers', url: 'https://acme.com/careers' }],
      jobs: [],
    });
    if (options.careersReadable !== false)
      pages.set('https://acme.com/careers', {
        url: 'https://acme.com/careers',
        text: options.careersJob
          ? 'Acme careers. Applied AI Engineer, San Francisco.'
          : 'Acme careers. Loading...',
        links: [],
        jobs: options.careersJob
          ? [
              {
                '@type': 'JobPosting',
                title: 'Applied AI Engineer',
                hiringOrganization: { name: 'Acme' },
                validThrough: '2027-01-01',
                description: 'Build agents.',
                jobLocation: {
                  address: { addressLocality: 'San Francisco' },
                },
              },
            ]
          : [],
      });
  }
  const deps: FunnelDeps = {
    read: async (url) => {
      const page = pages.get(url);
      if (!page) throw new Error('unreadable');
      return page;
    },
    search: async () => (options.findSite === false ? [] : [homeHit]),
    boards: async () => {
      throw new Error('no board');
    },
    render: options.render,
    websites: options.websites,
    maxRenders: options.maxRenders,
    budget: createTestDependencies().budget,
    now: () => checkedAt,
    maxCompanies: 10,
    locations: options.locations ?? ['Bay Area', 'remote'],
  };
  return () => researchCompanies([person], initialProfile, deps);
}
const rendering =
  (body: string, calls: string[] = []): Renderer =>
  async (url) => {
    calls.push(url);
    return { url, html: body };
  };

test('a role on the rendered careers page in a wanted place is verified', async () => {
  const out = await setup({
    render: rendering(
      html(
        listing(
          'Forward Deployed Engineer',
          'Sales & Customer Success',
          'San Francisco',
        ),
      ),
    ),
  })();
  const lead = out.leads[0];
  assert.equal(lead.status, 'verified-opening');
  assert.equal(lead.opening?.title, 'Forward Deployed Engineer');
  assert.equal(lead.opening?.location, 'San Francisco');
  assert.match(lead.opening?.url ?? '', /^https:\/\/acme\.com\/open-position/);
  assert.ok(lead.evidence.some((e) => e.kind === 'official-job'));
});

test('a matching role only in another place is a near miss, not verified', async () => {
  const out = await setup({
    render: rendering(
      html(listing('Forward Deployed Engineer', 'Sales', 'New York')),
    ),
  })();
  assert.equal(out.leads[0].status, 'no-matching-opening');
  assert.equal(out.leads[0].opening, undefined);
  assert.equal(out.leads[0].nearMiss?.reason, 'elsewhere');
});

test('a matching role with no place is a near miss with the place unknown', async () => {
  const out = await setup({
    render: rendering(html(listing('Forward Deployed Engineer'))),
  })();
  assert.equal(out.leads[0].status, 'no-matching-opening');
  assert.equal(out.leads[0].nearMiss?.reason, 'location-unknown');
});

test('without a renderer nothing changes', async () => {
  const out = await setup()();
  assert.equal(out.leads[0].status, 'no-matching-opening');
  assert.equal(out.leads[0].nearMiss, undefined);
});

test('a renderer that fails leaves the status as it was and does not throw', async () => {
  const out = await setup({
    render: async () => {
      throw new Error('browser down');
    },
  })();
  assert.equal(out.leads[0].status, 'no-matching-opening');
});

test('a supplied website is used when the company site could not be found', async () => {
  const out = await setup({
    findSite: false,
    websites: { Acme: 'https://acme.com/' },
    render: rendering(
      html(listing('Forward Deployed Engineer', 'Sales', 'San Francisco')),
    ),
  })();
  assert.equal(out.leads[0].status, 'verified-opening');
});

test('without a website there is nothing to render', async () => {
  const calls: string[] = [];
  const out = await setup({
    findSite: false,
    render: rendering(html(), calls),
  })();
  assert.equal(out.leads[0].status, 'site-not-found');
  assert.equal(calls.length, 0);
});

test('a read careers page with no match settles a page that could not be read', async () => {
  const out = await setup({
    careersReadable: false,
    render: rendering(html(listing('Account Executive', 'Sales', 'London'))),
  })();
  assert.equal(out.leads[0].status, 'no-matching-opening');
});

test('a rendered page with no listings does not settle anything', async () => {
  const out = await setup({
    careersReadable: false,
    render: rendering('<html><body>Loading...</body></html>'),
  })();
  assert.equal(out.leads[0].status, 'careers-unreadable');
});

test('at most two pages are rendered for one company', async () => {
  const calls: string[] = [];
  await setup({ render: rendering(html(), calls) })();
  assert.ok(calls.length <= 2, calls.join(','));
  assert.ok(calls.every((url) => url.startsWith('https://acme.com/')));
});

test('the number of renders in one run is capped', async () => {
  const calls: string[] = [];
  await setup({ render: rendering(html(), calls), maxRenders: 1 })();
  assert.equal(calls.length, 1);
});

test('an opening that is already verified is not rendered again', async () => {
  const calls: string[] = [];
  const out = await setup({
    careersJob: true,
    render: rendering(html(), calls),
  })();
  assert.equal(out.leads[0].status, 'verified-opening');
  assert.equal(calls.length, 0);
});

test('with no wanted places a matching rendered role anywhere is verified', async () => {
  const out = await setup({
    locations: [],
    render: rendering(
      html(listing('Forward Deployed Engineer', 'Sales', 'London')),
    ),
  })();
  assert.equal(out.leads[0].status, 'verified-opening');
});

test('a supplied website that was read but lists no matching role is no longer site not found', async () => {
  const out = await setup({
    findSite: false,
    websites: { Acme: 'https://acme.com/' },
    render: rendering(html(listing('Account Executive', 'Sales', 'London'))),
  })();
  assert.equal(out.leads[0].status, 'no-matching-opening');
  assert.equal(out.leads[0].website, 'https://acme.com/');
});
