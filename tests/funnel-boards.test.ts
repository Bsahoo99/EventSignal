import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialProfile } from '../lib/profile';
import type { Profile } from '../lib/contracts';
import type { SearchHit } from '../lib/server/discovery';
import type { BoardFetcher, BoardJob } from '../lib/server/boards';
import { researchCompanies, type FunnelDeps } from '../lib/server/funnel';
import type { Resolved } from '../lib/server/resolve';
import type { SourcePage } from '../lib/server/sources';
import { createTestDependencies } from './fixtures';

const checkedAt = '2026-11-04T10:00:00.000Z';
const person = (company: string): Resolved => ({
  name: 'Ada Chen',
  company,
  title: 'Engineer',
  source: 'guest-list',
  category: 'engineer',
  evidence: { url: 'guest-list', quote: 'q', checkedAt },
});
const home = (company: string, domain: string): SourcePage => ({
  url: `https://${domain}/`,
  title: company,
  text: `${company} builds agents and evaluation software for developers.`,
  links: [{ label: 'Careers', url: `https://${domain}/careers` }],
  jobs: [],
});
const careers = (
  company: string,
  domain: string,
  withJob: boolean,
): SourcePage => ({
  url: `https://${domain}/careers`,
  text: withJob
    ? `${company} is accepting applications for Applied AI Engineer.`
    : `${company} has no open roles right now.`,
  links: [],
  jobs: withJob
    ? [
        {
          '@type': 'JobPosting',
          title: 'Applied AI Engineer',
          hiringOrganization: { name: company },
          validThrough: '2027-01-01',
          description: 'Build agents.',
        },
      ]
    : [],
});
const homeHit = (domain: string): SearchHit => ({
  title: domain,
  url: `https://${domain}/`,
  description: 'site',
});
const boardHit = (url: string): SearchHit => ({
  title: 'board',
  url,
  description: 'jobs',
});
const job = (title: string, extra: Partial<BoardJob> = {}): BoardJob => ({
  title,
  url: `https://jobs.lever.co/acme/${encodeURIComponent(title)}`,
  ...extra,
});

function setup(options: {
  hits: SearchHit[];
  withHomepage?: boolean;
  careersJob?: boolean;
  boards: BoardFetcher;
  profile?: Profile;
  locations?: string[];
  // Extra links on the careers page, one per individual posting.
  postingLinks?: number;
}) {
  const pages = new Map<string, SourcePage>();
  if (options.withHomepage !== false) {
    pages.set('https://acme.com/', home('Acme', 'acme.com'));
    pages.set('https://acme.com/careers', {
      ...careers('Acme', 'acme.com', !!options.careersJob),
      links: Array.from({ length: options.postingLinks ?? 0 }, (_, i) => ({
        label: `Open role ${i}`,
        url: `https://acme.com/careers/openings/role-${i}`,
      })),
    });
  }
  const deps: FunnelDeps = {
    read: async (url) => {
      const page = pages.get(url);
      if (!page) throw new Error('unreadable');
      return page;
    },
    search: async () => options.hits,
    boards: options.boards,
    budget: createTestDependencies().budget,
    now: () => checkedAt,
    maxCompanies: 10,
    locations: options.locations,
  };
  return {
    run: () =>
      researchCompanies(
        [person('Acme')],
        options.profile ?? initialProfile,
        deps,
      ),
  };
}

test('a matching board job upgrades a company whose homepage showed no opening', async () => {
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acme/1')],
    boards: async () => [job('Applied AI Engineer', { location: 'Remote' })],
  }).run();
  const lead = out.leads[0];
  assert.equal(lead.status, 'verified-opening');
  assert.equal(lead.opening?.title, 'Applied AI Engineer');
  assert.equal(
    lead.opening?.url,
    'https://jobs.lever.co/acme/Applied%20AI%20Engineer',
  );
  assert.equal(lead.opening?.location, 'Remote');
  assert.equal(lead.website, 'https://acme.com/');
  assert.ok(
    lead.evidence.some(
      (e) =>
        e.kind === 'official-job' &&
        e.url === lead.opening?.url &&
        e.entity === 'Acme',
    ),
  );
});

test('a company whose website was not found still verifies from its board', async () => {
  const out = await setup({
    hits: [boardHit('https://jobs.lever.co/acme/1')],
    withHomepage: false,
    boards: async () => [job('Full Stack AI Engineer')],
  }).run();
  assert.equal(out.leads[0].status, 'verified-opening');
  assert.equal(out.leads[0].website, undefined);
});

test('a board whose slug is a different company is never used', async () => {
  const asked: string[] = [];
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acmeother/1')],
    boards: async (board) => {
      asked.push(board.slug);
      return [];
    },
  }).run();
  assert.equal(out.leads[0].status, 'no-matching-opening');
  assert.ok(!asked.includes('acmeother'), asked.join(','));
});

test('board jobs whose titles match none of the profile roles change nothing', async () => {
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acme/1')],
    boards: async () => [
      job('Account Executive'),
      job('Software Engineer, Platform'),
    ],
  }).run();
  assert.equal(out.leads[0].status, 'no-matching-opening');
  assert.equal(out.leads[0].opening, undefined);
});

test('a management title that merely contains the role words is not verified', async () => {
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acme/1')],
    boards: async () => [
      job('Regional Director, Applied AI Engineer Programs'),
      job('Forward Deployed Engineering'),
    ],
  }).run();
  assert.equal(out.leads[0].status, 'no-matching-opening');
});

test('a failing board request leaves the status unchanged and does not throw', async () => {
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acme/1')],
    boards: async () => {
      throw new Error('board down');
    },
  }).run();
  assert.equal(out.leads[0].status, 'no-matching-opening');
});

test('a board job that names a different organization is rejected', async () => {
  const out = await setup({
    hits: [
      homeHit('acme.com'),
      boardHit('https://boards.greenhouse.io/acme/jobs/1'),
    ],
    boards: async () => [
      job('Applied AI Engineer', { organization: 'Other Co' }),
    ],
  }).run();
  assert.equal(out.leads[0].status, 'no-matching-opening');
});

test('hard constraints keep a board match from being called verified', async () => {
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acme/1')],
    boards: async () => [job('Applied AI Engineer')],
    profile: { ...initialProfile, constraints: 'Must be in Berlin' },
  }).run();
  assert.equal(out.leads[0].status, 'constraints-unverified');
  assert.equal(out.leads[0].opening, undefined);
});

test('boards are not queried when the careers page already verified an opening', async () => {
  let called = 0;
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acme/1')],
    careersJob: true,
    boards: async () => {
      called += 1;
      return [];
    },
  }).run();
  assert.equal(out.leads[0].status, 'verified-opening');
  assert.equal(called, 0);
});

test('with no board links in the search hits, likely board names are probed directly', async () => {
  const asked: string[] = [];
  const out = await setup({
    hits: [homeHit('acme.com')],
    boards: async (board) => {
      asked.push(`${board.vendor}:${board.slug}`);
      if (board.vendor === 'lever') return [job('Applied AI Engineer')];
      throw new Error('404');
    },
  }).run();
  assert.deepEqual(asked, ['ashby:acme', 'greenhouse:acme', 'lever:acme']);
  assert.equal(out.leads[0].status, 'verified-opening');
});

test('boards found in the search hits are tried before guessed ones', async () => {
  const asked: string[] = [];
  await setup({
    hits: [homeHit('acme.com'), boardHit('https://boards.greenhouse.io/acme')],
    boards: async (board) => {
      asked.push(`${board.vendor}:${board.slug}`);
      return [];
    },
  }).run();
  assert.equal(asked[0], 'greenhouse:acme');
  assert.equal(new Set(asked).size, asked.length);
});

test('at most six board lookups are made per company', async () => {
  let called = 0;
  await setup({
    hits: [
      homeHit('acme.com'),
      boardHit('https://jobs.lever.co/acme/1'),
      boardHit('https://jobs.ashbyhq.com/acme'),
      boardHit('https://boards.greenhouse.io/acme'),
    ],
    boards: async () => {
      called += 1;
      return [];
    },
  }).run();
  assert.ok(called <= 6, `called ${called}`);
});

const boardHits = [
  homeHit('acme.com'),
  boardHit('https://jobs.lever.co/acme/1'),
];

test('with wanted locations, a matching title in another city is not verified', async () => {
  const out = await setup({
    hits: boardHits,
    locations: ['Bangalore'],
    boards: async () => [
      job('Applied AI Engineer', { location: 'London, UK' }),
    ],
  }).run();
  const lead = out.leads[0];
  assert.equal(lead.status, 'no-matching-opening');
  assert.equal(lead.opening, undefined);
  assert.equal(lead.nearMiss?.reason, 'elsewhere');
  assert.equal(lead.nearMiss?.title, 'Applied AI Engineer');
  assert.equal(lead.nearMiss?.location, 'London, UK');
});

test('with wanted locations, a matching title in a wanted city is verified', async () => {
  const out = await setup({
    hits: boardHits,
    locations: ['Bangalore'],
    boards: async () => [
      job('Applied AI Engineer', { location: 'Bengaluru, India' }),
    ],
  }).run();
  assert.equal(out.leads[0].status, 'verified-opening');
  assert.equal(out.leads[0].opening?.location, 'Bengaluru, India');
  assert.equal(out.leads[0].nearMiss, undefined);
});

test('a later job in the wanted city wins over an earlier one elsewhere', async () => {
  const out = await setup({
    hits: boardHits,
    locations: ['Bangalore'],
    boards: async () => [
      job('Applied AI Engineer', { location: 'London' }),
      job('Full Stack AI Engineer', { location: 'Bangalore' }),
    ],
  }).run();
  assert.equal(out.leads[0].status, 'verified-opening');
  assert.equal(out.leads[0].opening?.title, 'Full Stack AI Engineer');
});

test('a matching title with no listed location is a near miss, not verified', async () => {
  const out = await setup({
    hits: boardHits,
    locations: ['Bangalore'],
    boards: async () => [job('Applied AI Engineer')],
  }).run();
  assert.equal(out.leads[0].status, 'no-matching-opening');
  assert.equal(out.leads[0].opening, undefined);
  assert.equal(out.leads[0].nearMiss?.reason, 'location-unknown');
});

test('an unknown-location near miss is preferred over an elsewhere one', async () => {
  const out = await setup({
    hits: boardHits,
    locations: ['Bangalore'],
    boards: async () => [
      job('Applied AI Engineer', { location: 'London' }),
      job('Full Stack AI Engineer'),
    ],
  }).run();
  assert.equal(out.leads[0].nearMiss?.reason, 'location-unknown');
  assert.equal(out.leads[0].nearMiss?.title, 'Full Stack AI Engineer');
});

test('with no wanted locations a job anywhere still verifies and no near miss is set', async () => {
  const out = await setup({
    hits: boardHits,
    boards: async () => [
      job('Applied AI Engineer', { location: 'London, UK' }),
    ],
  }).run();
  assert.equal(out.leads[0].status, 'verified-opening');
  assert.equal(out.leads[0].nearMiss, undefined);
});

test('a careers-page opening with no location is not verified when locations are wanted', async () => {
  const out = await setup({
    hits: boardHits,
    careersJob: true,
    locations: ['Bangalore'],
    boards: async () => [],
  }).run();
  assert.equal(out.leads[0].status, 'no-matching-opening');
  assert.equal(out.leads[0].opening, undefined);
  assert.equal(out.leads[0].nearMiss?.reason, 'location-unknown');
});

test('boards are still checked when a careers-page opening fails the location check', async () => {
  const out = await setup({
    hits: boardHits,
    careersJob: true,
    locations: ['Bangalore'],
    boards: async () => [job('Applied AI Engineer', { location: 'Bangalore' })],
  }).run();
  assert.equal(out.leads[0].status, 'verified-opening');
  assert.equal(out.leads[0].opening?.location, 'Bangalore');
  assert.equal(out.leads[0].nearMiss, undefined);
});

test('hard constraints still stop a location match from being verified', async () => {
  const out = await setup({
    hits: boardHits,
    locations: ['Bangalore'],
    boards: async () => [job('Applied AI Engineer', { location: 'Bangalore' })],
    profile: { ...initialProfile, constraints: 'Must pay above a floor' },
  }).run();
  assert.equal(out.leads[0].status, 'constraints-unverified');
  assert.equal(out.leads[0].opening, undefined);
});

test('a careers page with more postings than can be read is not reported as a time limit', async () => {
  const out = await setup({
    hits: [homeHit('acme.com')],
    postingLinks: 12,
    boards: async () => {
      throw new Error('no board');
    },
  }).run();
  assert.equal(out.leads[0].status, 'careers-unreadable');
  assert.equal(out.leads[0].opening, undefined);
});

test('a job board that was read in full settles a careers page that is too large', async () => {
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acme/1')],
    postingLinks: 12,
    boards: async () => [job('Account Executive')],
  }).run();
  assert.equal(out.leads[0].status, 'no-matching-opening');
});

test('a matching board job still verifies a company whose careers page is too large', async () => {
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acme/1')],
    postingLinks: 12,
    boards: async () => [job('Forward Deployed Engineer')],
  }).run();
  assert.equal(out.leads[0].status, 'verified-opening');
});
