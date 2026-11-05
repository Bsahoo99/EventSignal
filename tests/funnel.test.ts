import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialProfile } from '../lib/profile';
import type { SearchHit } from '../lib/server/discovery';
import { researchCompanies, type FunnelDeps } from '../lib/server/funnel';
import type { Resolved } from '../lib/server/resolve';
import type { SourcePage } from '../lib/server/sources';
import { createTestDependencies } from './fixtures';

const checkedAt = '2026-11-04T10:00:00.000Z';
const person = (
  name: string,
  company: string,
  title = 'Engineer',
): Resolved => ({
  name,
  company,
  title,
  category: 'engineer',
  evidence: {
    url: 'guest-list',
    quote: `${name} - ${title} at ${company}`,
    checkedAt,
  },
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
          description: 'Build agents and evaluation systems.',
        },
      ]
    : [],
});
const sites: Record<string, { domain: string; job: boolean }> = {
  acme: { domain: 'acme.com', job: true },
  globex: { domain: 'globex.com', job: false },
  initech: { domain: 'initech.com', job: false },
};
function makeDeps(overrides: Partial<FunnelDeps> = {}) {
  const searched: string[] = [];
  const pages = new Map<string, SourcePage>();
  for (const [key, site] of Object.entries(sites)) {
    const name = key[0].toUpperCase() + key.slice(1);
    pages.set(`https://${site.domain}/`, home(name, site.domain));
    pages.set(
      `https://${site.domain}/careers`,
      careers(name, site.domain, site.job),
    );
  }
  const deps: FunnelDeps = {
    read: async (url) => {
      const page = pages.get(url);
      if (!page) throw new Error(`unreadable ${url}`);
      return page;
    },
    search: async (query) => {
      searched.push(query);
      const key = query.match(/^"([^"]+)"/)?.[1].toLowerCase() ?? '';
      const site = sites[key];
      const hits: SearchHit[] = site
        ? [{ title: key, url: `https://${site.domain}/`, description: key }]
        : [];
      return hits;
    },
    budget: createTestDependencies().budget,
    now: () => checkedAt,
    maxCompanies: 40,
    ...overrides,
  };
  return { deps, searched };
}

test('people at the same company collapse into one lead', async () => {
  const { deps } = makeDeps();
  const out = await researchCompanies(
    [person('Ada Chen', 'Acme'), person('Bo Park', 'ACME')],
    initialProfile,
    deps,
  );
  assert.equal(out.leads.length, 1);
  assert.deepEqual(
    out.leads[0].people.map((p) => p.name),
    ['Ada Chen', 'Bo Park'],
  );
});

test('a matching official opening gives a verified lead with the opening', async () => {
  const { deps } = makeDeps();
  const out = await researchCompanies(
    [person('Ada Chen', 'Acme')],
    initialProfile,
    deps,
  );
  const lead = out.leads[0];
  assert.equal(lead.status, 'verified-opening');
  assert.equal(lead.opening?.title, 'Applied AI Engineer');
  assert.equal(lead.opening?.url, 'https://acme.com/careers');
  assert.equal(lead.checkedAt, checkedAt);
  assert.ok(lead.evidence.some((e) => e.kind === 'official-job'));
});

test('a company with no matching opening is never described as hiring', async () => {
  const { deps } = makeDeps();
  const out = await researchCompanies(
    [person('Gil Roe', 'Globex')],
    initialProfile,
    deps,
  );
  const lead = out.leads[0];
  assert.equal(lead.status, 'no-matching-opening');
  assert.equal(lead.opening, undefined);
});

test('a company whose website cannot be found keeps its status and is not claimed hiring', async () => {
  const { deps } = makeDeps();
  const out = await researchCompanies(
    [person('Zed Lee', 'Nowhere Labs')],
    initialProfile,
    deps,
  );
  assert.equal(out.leads[0].status, 'site-not-found');
  assert.equal(out.leads[0].opening, undefined);
});

test('maxCompanies researches the best-connected companies and lists the rest as skipped', async () => {
  const { deps, searched } = makeDeps({ maxCompanies: 2 });
  const out = await researchCompanies(
    [
      person('A One', 'Acme'),
      person('A Two', 'Acme'),
      person('G One', 'Globex'),
      person('G Two', 'Globex'),
      person('I One', 'Initech'),
    ],
    initialProfile,
    deps,
  );
  assert.deepEqual(out.leads.map((l) => l.company).sort(), ['Acme', 'Globex']);
  assert.deepEqual(out.skipped, ['Initech']);
  assert.equal(searched.length, 2);
});

test('verified openings come first, then more people', async () => {
  const { deps } = makeDeps();
  const out = await researchCompanies(
    [
      person('G One', 'Globex'),
      person('G Two', 'Globex'),
      person('A One', 'Acme'),
    ],
    initialProfile,
    deps,
  );
  assert.deepEqual(
    out.leads.map((l) => l.company),
    ['Acme', 'Globex'],
  );
});

test('the description comes from the company page and is empty when none is established', async () => {
  const { deps } = makeDeps();
  const out = await researchCompanies(
    [person('A One', 'Acme'), person('Z One', 'Nowhere Labs')],
    initialProfile,
    deps,
  );
  const acme = out.leads.find((l) => l.company === 'Acme')!;
  const nowhere = out.leads.find((l) => l.company === 'Nowhere Labs')!;
  assert.match(acme.description, /Acme builds agents and evaluation software/);
  assert.equal(nowhere.description, '');
});

test('each company search is recorded in the ledger at 0.008', async () => {
  const { deps } = makeDeps();
  await researchCompanies([person('A One', 'Acme')], initialProfile, deps);
  assert.equal(deps.budget.total(), 0.008);
});

test('a deadline that has passed skips every remaining company', async () => {
  const { deps, searched } = makeDeps({ deadlineMs: -1 });
  const out = await researchCompanies(
    [person('A One', 'Acme')],
    initialProfile,
    deps,
  );
  assert.equal(out.leads.length, 0);
  assert.deepEqual(out.skipped, ['Acme']);
  assert.equal(searched.length, 0);
});

test('a full ledger yields a research-limited lead instead of an exception', async () => {
  const { deps } = makeDeps();
  deps.budget.reserve = () => {
    throw new Error('Application budget reached.');
  };
  const out = await researchCompanies(
    [person('A One', 'Acme')],
    initialProfile,
    deps,
  );
  assert.equal(out.leads[0].status, 'research-limited');
  assert.equal(out.leads[0].opening, undefined);
});
