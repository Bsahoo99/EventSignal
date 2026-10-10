import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../lib/server/analysis';
import { initialProfile } from '../lib/profile';
import { createTestDependencies, eventText } from './fixtures';
import type { SourcePage } from '../lib/server/sources';
const event: SourcePage = {
  url: 'https://events.example.org/program',
  text: eventText,
  links: [{ label: 'Acme', url: 'https://acme.com' }],
  jobs: [],
};
const company: SourcePage = {
  url: 'https://acme.com',
  text: 'Acme builds agents and evaluation software.',
  links: [{ label: 'Careers', url: 'https://acme.com/careers' }],
  jobs: [],
};
const jobs: SourcePage = {
  url: 'https://acme.com/careers',
  text: 'Acme is accepting applications for Applied AI Engineer.',
  links: [],
  jobs: [
    {
      '@type': 'JobPosting',
      title: 'Applied AI Engineer',
      hiringOrganization: { name: 'Acme' },
      validThrough: '2027-01-01',
      description: 'Build agents and evaluation systems.',
    },
  ],
};
export function pagesReader(pages: SourcePage[]) {
  return async (url: string) => {
    const page = pages.find((p) => p.url === url);
    if (!page) throw new Error('Unreadable page');
    return page;
  };
}
test('direct official opening evidence upgrades a relevant event connection', async () => {
  const result = await analyze(
    { profile: initialProfile, event: { kind: 'url', url: event.url } },
    createTestDependencies({ readPage: pagesReader([event, company, jobs]) }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const rec = result.brief.recommendations[0];
  assert.equal(rec.opportunity.kind, 'verified-opening');
  if (rec.opportunity.kind === 'verified-opening') {
    assert.equal(rec.opportunity.opening.title, 'Applied AI Engineer');
    assert.equal(rec.opportunity.opening.url, 'https://acme.com/careers');
  }
  assert.ok(rec.evidence.some((e) => e.kind === 'official-job'));
});
test('a readable role title survives an unreadable additional details page', async () => {
  const page = {
    ...company,
    jobs: jobs.jobs,
    text: 'Acme is accepting applications for Applied AI Engineer.',
    links: [{ label: 'Job details', url: 'https://acme.com/jobs/details' }],
  };
  const result = await analyze(
    { profile: initialProfile, event: { kind: 'url', url: event.url } },
    createTestDependencies({ readPage: pagesReader([event, page]) }),
  );
  assert.equal(result.ok, true);
  if (result.ok)
    assert.equal(
      result.brief.recommendations[0].opportunity.kind,
      'verified-opening',
    );
});
test('snippets, closed roles, expired roles and unrelated ATS jobs never verify', async () => {
  for (const change of [
    { jobs: [] },
    { text: 'Applied AI Engineer — position closed.' },
    {
      jobs: [
        {
          ...(jobs.jobs[0] as Record<string, unknown>),
          validThrough: '2020-01-01',
        },
      ],
    },
    {
      jobs: [
        {
          ...(jobs.jobs[0] as Record<string, unknown>),
          hiringOrganization: { name: 'Other Company' },
        },
      ],
    },
  ]) {
    const result = await analyze(
      { profile: initialProfile, event: { kind: 'url', url: event.url } },
      createTestDependencies({
        readPage: pagesReader([event, company, { ...jobs, ...change }]),
      }),
    );
    assert.equal(result.ok, true);
    if (result.ok)
      assert.equal(
        result.brief.recommendations[0].opportunity.kind,
        'exploratory',
      );
  }
});
test('ATS is evidence only when linked from the official company site', async () => {
  const ats = { ...jobs, url: 'https://jobs.ashbyhq.com/acme' };
  const associated = await analyze(
    { profile: initialProfile, event: { kind: 'url', url: event.url } },
    createTestDependencies({
      readPage: pagesReader([
        event,
        { ...company, links: [{ label: 'Careers', url: ats.url }] },
        ats,
      ]),
    }),
  );
  assert.equal(associated.ok, true);
  if (associated.ok)
    assert.equal(
      associated.brief.recommendations[0].opportunity.kind,
      'verified-opening',
    );
  const unrelated = await analyze(
    { profile: initialProfile, event: { kind: 'url', url: event.url } },
    createTestDependencies({
      readPage: pagesReader([
        { ...event, links: [{ label: 'Acme', url: ats.url }] },
        ats,
      ]),
    }),
  );
  assert.equal(unrelated.ok, true);
  if (unrelated.ok)
    assert.equal(
      unrelated.brief.recommendations[0].opportunity.kind,
      'exploratory',
    );
});
test('an unverified hard constraint prevents promotion to a verified match', async () => {
  const result = await analyze(
    {
      profile: { ...initialProfile, constraints: 'Must sponsor a work visa' },
      event: { kind: 'url', url: event.url },
    },
    createTestDependencies({ readPage: pagesReader([event, company, jobs]) }),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.brief.recommendations[0].opportunity.kind,
      'exploratory',
    );
    assert.match(
      result.brief.recommendations[0].uncertainties.join(' '),
      /hard constraints/i,
    );
  }
});
test('contradictory closed detail overrides an older listing on the careers page', async () => {
  const detail = {
    url: 'https://acme.com/jobs/ai',
    text: 'Applied AI Engineer: this position is closed.',
    jobs: [],
    links: [],
  };
  const result = await analyze(
    { profile: initialProfile, event: { kind: 'url', url: event.url } },
    createTestDependencies({
      readPage: pagesReader([
        event,
        company,
        { ...jobs, links: [{ label: 'Job details', url: detail.url }] },
        detail,
      ]),
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok)
    assert.equal(
      result.brief.recommendations[0].opportunity.kind,
      'exploratory',
    );
});

test('ordinary filled and now-closed wording excludes stale structured listings', async () => {
  for (const text of [
    'Applied AI Engineer — this position has been filled.',
    'Applied AI Engineer. Applications are now closed.',
  ]) {
    const result = await analyze(
      { profile: initialProfile, event: { kind: 'url', url: event.url } },
      createTestDependencies({
        readPage: pagesReader([event, company, { ...jobs, text }]),
      }),
    );
    assert.equal(result.ok, true);
    if (result.ok)
      assert.equal(
        result.brief.recommendations[0].opportunity.kind,
        'exploratory',
      );
  }
});
test('a closed unrelated position does not suppress an open matching role', async () => {
  const result = await analyze(
    { profile: initialProfile, event: { kind: 'url', url: event.url } },
    createTestDependencies({
      readPage: pagesReader([
        event,
        company,
        {
          ...jobs,
          text: 'Applied AI Engineer — accepting applications. Product Designer — position closed.',
        },
      ]),
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok)
    assert.equal(
      result.brief.recommendations[0].opportunity.kind,
      'verified-opening',
    );
});

test('verified matching roles rank ahead of earlier exploratory connections without padding', async () => {
  const { extraction } = await import('./fixtures');
  const beta = {
    ...extraction.entities[0],
    name: 'Ben Fox',
    company: 'Beta',
    quote: 'Speaker Ben Fox from Beta presents agents.',
    topics: ['agents'],
  };
  const source = { ...event, text: beta.quote + ' ' + event.text };
  const result = await analyze(
    { profile: initialProfile, event: { kind: 'url', url: event.url } },
    createTestDependencies({
      extract: async () => ({
        data: { ...extraction, entities: [beta, extraction.entities[0]] },
      }),
      readPage: pagesReader([source, company, jobs]),
    }),
  );
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(
      result.brief.recommendations.map((rec) => rec.name),
      ['Ada Chen', 'Ben Fox'],
    );
    assert.equal(
      result.brief.recommendations[1].opportunity.kind,
      'exploratory',
    );
  }
});
