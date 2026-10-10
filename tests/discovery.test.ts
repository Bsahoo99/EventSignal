import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../lib/server/analysis';
import { initialProfile } from '../lib/profile';
import { createTestDependencies, eventText } from './fixtures';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SearchCache, braveSearch } from '../lib/server/search';
test('the existing budget cap stops discovery and expired searches are charged again', async () => {
  const deps = createTestDependencies({ search: async () => [] });
  for (let i = 0; i < 79; i++) deps.budget.settle(deps.budget.reserve());
  const limited = await analyze(
    { profile: initialProfile, event: { kind: 'text', text: eventText } },
    deps,
  );
  assert.equal(limited.ok, true);
  if (limited.ok) {
    assert.equal(
      limited.brief.recommendations[0].research?.status,
      'research-limited',
    );
    assert.equal(deps.budget.total(), 7.901);
  }
  const cache = new SearchCache(
    join(mkdtempSync(join(tmpdir(), 'eventsignal-search-')), 'cache.sqlite'),
  );
  const cachedDeps = createTestDependencies({
    searchCache: cache,
    search: async () => [],
  });
  const input = {
    profile: initialProfile,
    event: { kind: 'text', text: eventText },
  };
  await analyze(input, cachedDeps);
  const expired = await analyze(input, {
    ...cachedDeps,
    now: () => '2026-10-11T05:00:01.000Z',
  });
  assert.equal(expired.ok, true);
  if (expired.ok) assert.equal(expired.chargedUsd, 0.006);
  assert.equal(cachedDeps.budget.total(), 0.012);
});
test('similarly named or multiple plausible companies remain ambiguous', async () => {
  for (const scenario of ['different-name', 'multiple'] as const) {
    const result = await analyze(
      { profile: initialProfile, event: { kind: 'text', text: eventText } },
      createTestDependencies({
        search: async () => [
          { title: 'Acme', url: 'https://acme.com', description: 'agents' },
          ...(scenario === 'multiple'
            ? [{ title: 'Acme', url: 'https://acme.ai', description: 'agents' }]
            : []),
        ],
        readPage: async (url) => ({
          url,
          title: scenario === 'different-name' ? 'SuperAcme' : 'Acme',
          text: 'Acme and agents appear in this page.',
          links: [],
          jobs: [],
        }),
      }),
    );
    assert.equal(result.ok, true);
    if (!result.ok) continue;
    assert.equal(
      result.brief.recommendations[0].research?.status,
      'site-ambiguous',
    );
    assert.equal(
      result.brief.recommendations[0].opportunity.kind,
      'exploratory',
    );
  }
});
test('Brave search snippets are discovery only and failed requests retain their reservation', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () =>
    Response.json({
      web: {
        results: [
          {
            title: 'Acme careers',
            url: 'https://acme.com/careers',
            description: 'Applied AI Engineer — apply now',
          },
        ],
      },
    });
  const deps = createTestDependencies({
    search: braveSearch('fixture-search-key'),
    readPage: async (url) => ({
      url,
      title: 'Acme',
      text: 'Acme builds agents.',
      links: [],
      jobs: [],
    }),
  });
  const input = {
    profile: initialProfile,
    event: { kind: 'text', text: eventText },
  };
  const first = await analyze(input, deps);
  assert.equal(first.ok, true);
  if (!first.ok) return;
  assert.equal(first.brief.recommendations[0].opportunity.kind, 'exploratory');
  assert.equal(
    first.brief.recommendations[0].research?.status,
    'no-matching-opening',
  );
  globalThis.fetch = async () => {
    throw new Error('Search timeout');
  };
  const failed = await analyze(input, deps);
  assert.equal(failed.ok, true);
  if (!failed.ok) return;
  assert.equal(
    failed.brief.recommendations[0].research?.status,
    'search-unavailable',
  );
  assert.equal(failed.chargedUsd, 0.101);
  assert.equal(deps.budget.total(), 0.107);
});
test('the owner can supply a website when search is unavailable without inventing an opening', async () => {
  const result = await analyze(
    {
      profile: initialProfile,
      event: { kind: 'text', text: eventText },
      companyWebsites: [{ company: 'Acme', url: 'https://acme.com/' }],
    },
    createTestDependencies({
      readPage: async (url) => ({
        url,
        title: 'Acme',
        text: 'Acme builds agents.',
        links: [],
        jobs: [],
      }),
    }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(
    result.brief.recommendations[0].research?.status,
    'no-matching-opening',
  );
  assert.equal(
    result.brief.recommendations[0].research?.website,
    'https://acme.com/',
  );
  assert.equal(result.brief.recommendations[0].opportunity.kind, 'exploratory');
  assert.equal(result.chargedUsd, 0.001);
});

test('cached discovery avoids another search charge but official pages are checked again', async () => {
  const cache = new SearchCache(
    join(mkdtempSync(join(tmpdir(), 'eventsignal-search-')), 'cache.sqlite'),
  );
  const input = {
    profile: initialProfile,
    event: { kind: 'text', text: eventText },
  };
  const deps = createTestDependencies({
    searchCache: cache,
    search: async () => [
      {
        title: 'Acme',
        url: 'https://acme.com',
        description: 'Applied AI Engineer available',
      },
    ],
    readPage: async (url) => ({
      url,
      title: 'Acme',
      text: 'Acme builds agents.',
      links: [],
      jobs: [],
    }),
  });
  const first = await analyze(input, deps);
  assert.equal(first.ok, true);
  const second = await analyze(input, {
    ...deps,
    search: async () => {
      throw new Error('Offline');
    },
    readPage: async () => {
      throw new Error('Website now unavailable');
    },
  });
  assert.equal(second.ok, true);
  if (!second.ok) return;
  assert.equal(second.chargedUsd, 0.001);
  assert.equal(
    second.brief.recommendations[0].research?.status,
    'site-unreadable',
  );
  assert.equal(second.brief.recommendations[0].opportunity.kind, 'exploratory');
  assert.equal(deps.budget.total(), 0.007);
});

test('a missing event link can be discovered and verified using official pages, not search claims', async () => {
  const deps = createTestDependencies({
    search: async () => [
      {
        title: 'Acme official website',
        url: 'https://acme.com',
        description: 'Acme builds agents.',
      },
    ],
    readPage: async (url) => {
      if (url === 'https://acme.com/')
        return {
          url,
          title: 'Acme',
          text: 'Acme builds agents and evaluation software.',
          links: [{ label: 'Careers', url: 'https://acme.com/careers' }],
          jobs: [],
        };
      if (url === 'https://acme.com/careers')
        return {
          url,
          text: 'Acme is accepting applications for Applied AI Engineer.',
          links: [],
          jobs: [
            {
              title: 'Applied AI Engineer',
              hiringOrganization: { name: 'Acme' },
            },
          ],
        };
      throw new Error('Unknown public page');
    },
  });
  const result = await analyze(
    { profile: initialProfile, event: { kind: 'text', text: eventText } },
    deps,
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const rec = result.brief.recommendations[0];
  assert.equal(rec.opportunity.kind, 'verified-opening');
  assert.equal(rec.research?.status, 'verified-opening');
  assert.equal(rec.research?.website, 'https://acme.com/');
  assert.ok(rec.evidence.some((e) => e.kind === 'company-page'));
  assert.equal(result.chargedUsd, 0.006);
});
