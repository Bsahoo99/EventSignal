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
}) {
  const pages = new Map<string, SourcePage>();
  if (options.withHomepage !== false) {
    pages.set('https://acme.com/', home('Acme', 'acme.com'));
    pages.set(
      'https://acme.com/careers',
      careers('Acme', 'acme.com', !!options.careersJob),
    );
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

test('a board whose slug is a different company is ignored', async () => {
  let called = 0;
  const out = await setup({
    hits: [homeHit('acme.com'), boardHit('https://jobs.lever.co/acmeother/1')],
    boards: async () => {
      called += 1;
      return [job('Applied AI Engineer')];
    },
  }).run();
  assert.equal(out.leads[0].status, 'no-matching-opening');
  assert.equal(called, 0);
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

test('at most three boards are queried per company', async () => {
  let called = 0;
  await setup({
    hits: [
      homeHit('acme.com'),
      boardHit('https://jobs.lever.co/acme/1'),
      boardHit('https://jobs.ashbyhq.com/acme'),
      boardHit('https://boards.greenhouse.io/acme'),
      boardHit('https://jobs.eu.lever.co/acme/2'),
    ],
    boards: async () => {
      called += 1;
      return [];
    },
  }).run();
  assert.ok(called <= 3, `called ${called}`);
});
