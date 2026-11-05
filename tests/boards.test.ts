import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SearchHit } from '../lib/server/discovery';
import {
  boardsFromHits,
  guessBoards,
  publicBoardFetcher,
  titleMatchesRole,
} from '../lib/server/boards';

const hit = (url: string): SearchHit => ({ title: 't', url, description: 'd' });

test('boards are taken from Ashby, Greenhouse and Lever hits whose slug matches the company', () => {
  const boards = boardsFromHits('Vercel', [
    hit('http://job-boards.greenhouse.io/vercel'),
    hit('https://jobs.ashbyhq.com/Vercel/abc-123'),
    hit('https://jobs.lever.co/vercel/xyz'),
    hit('https://boards.greenhouse.io/vercel/jobs/1'),
  ]);
  assert.deepEqual(
    boards.map((b) => `${b.vendor}:${b.slug.toLowerCase()}`).sort(),
    ['ashby:vercel', 'greenhouse:vercel', 'lever:vercel'],
  );
});

test('hits for other companies, other hosts and aggregators are ignored', () => {
  const boards = boardsFromHits('Linear', [
    hit('https://jobs.ashbyhq.com/linearly-different/1'),
    hit('https://www.linkedin.com/company/linear/jobs'),
    hit('https://wfh.team/companies/linear'),
    hit('https://jobs.a16z.com/jobs/linear'),
    hit('https://evil.example/jobs.ashbyhq.com/Linear'),
  ]);
  assert.deepEqual(boards, []);
});

test('slugs match the company ignoring case, spaces and punctuation', () => {
  const boards = boardsFromHits('Scale AI', [
    hit('https://jobs.lever.co/scale-ai'),
  ]);
  assert.equal(boards.length, 1);
});

test('slugs with unsafe characters are ignored', () => {
  const boards = boardsFromHits('Acme', [
    hit('https://jobs.lever.co/acme%2F..%2Fx'),
    hit('https://jobs.lever.co/acme.evil'),
  ]);
  assert.deepEqual(boards, []);
});

test('duplicate boards are returned once, one per vendor and slug', () => {
  const boards = boardsFromHits('Acme', [
    hit('https://jobs.lever.co/acme/1'),
    hit('https://jobs.lever.co/acme/2'),
    hit('https://jobs.ashbyhq.com/acme'),
    hit('https://boards.greenhouse.io/acme'),
  ]);
  assert.equal(boards.length, 3);
  assert.equal(new Set(boards.map((b) => b.vendor)).size, 3);
});

type Seen = { url: string; init?: RequestInit };
function stub(
  t: { after: (fn: () => void) => void },
  reply: (url: string) => Response,
) {
  const original = globalThis.fetch;
  const seen: Seen[] = [];
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    seen.push({ url: String(url), init });
    return reply(String(url));
  }) as typeof fetch;
  return seen;
}

test('the Ashby fetcher uses the public posting API and skips unlisted jobs', async (t) => {
  const seen = stub(t, () =>
    Response.json({
      jobs: [
        {
          title: 'Applied AI Engineer',
          jobUrl: 'https://jobs.ashbyhq.com/acme/1',
          location: 'Remote',
          isListed: true,
        },
        {
          title: 'Hidden Role',
          jobUrl: 'https://jobs.ashbyhq.com/acme/2',
          isListed: false,
        },
      ],
    }),
  );
  const jobs = await publicBoardFetcher()({ vendor: 'ashby', slug: 'acme' });
  assert.deepEqual(jobs, [
    {
      title: 'Applied AI Engineer',
      url: 'https://jobs.ashbyhq.com/acme/1',
      location: 'Remote',
    },
  ]);
  assert.equal(
    seen[0].url,
    'https://api.ashbyhq.com/posting-api/job-board/acme',
  );
  assert.ok(!seen[0].init?.method || seen[0].init.method === 'GET');
});

test('the Greenhouse fetcher uses the public boards API and keeps the organization name', async (t) => {
  const seen = stub(t, () =>
    Response.json({
      jobs: [
        {
          title: 'Forward Deployed Engineer',
          absolute_url: 'https://job-boards.greenhouse.io/acme/jobs/1',
          location: { name: 'San Francisco' },
          company_name: 'Acme',
        },
      ],
    }),
  );
  const jobs = await publicBoardFetcher()({
    vendor: 'greenhouse',
    slug: 'acme',
  });
  assert.deepEqual(jobs, [
    {
      title: 'Forward Deployed Engineer',
      url: 'https://job-boards.greenhouse.io/acme/jobs/1',
      location: 'San Francisco',
      organization: 'Acme',
    },
  ]);
  assert.equal(
    seen[0].url,
    'https://boards-api.greenhouse.io/v1/boards/acme/jobs',
  );
});

test('the Lever fetcher uses the public postings API', async (t) => {
  const seen = stub(t, () =>
    Response.json([
      {
        text: 'Full Stack AI Engineer',
        hostedUrl: 'https://jobs.lever.co/acme/9',
        categories: { location: 'Remote' },
      },
    ]),
  );
  const jobs = await publicBoardFetcher()({ vendor: 'lever', slug: 'acme' });
  assert.deepEqual(jobs, [
    {
      title: 'Full Stack AI Engineer',
      url: 'https://jobs.lever.co/acme/9',
      location: 'Remote',
    },
  ]);
  assert.equal(seen[0].url, 'https://api.lever.co/v0/postings/acme?mode=json');
});

test('a non-OK response, invalid JSON or an unsafe slug throws', async (t) => {
  stub(t, () => new Response('no', { status: 404 }));
  await assert.rejects(
    () => publicBoardFetcher()({ vendor: 'lever', slug: 'acme' }),
    /board/i,
  );
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = (async () => new Response('not json')) as typeof fetch;
  await assert.rejects(() =>
    publicBoardFetcher()({ vendor: 'ashby', slug: 'acme' }),
  );
  await assert.rejects(
    () => publicBoardFetcher()({ vendor: 'ashby', slug: '../x' }),
    /slug/i,
  );
});

test('an oversized board response is refused', async (t) => {
  stub(t, () => new Response('x'.repeat(3_500_000)));
  await assert.rejects(
    () => publicBoardFetcher()({ vendor: 'ashby', slug: 'acme' }),
    /large|oversized/i,
  );
});

test('guessBoards tries the company name as a slug on all three vendors', () => {
  assert.deepEqual(guessBoards('Acme'), [
    { vendor: 'ashby', slug: 'acme' },
    { vendor: 'greenhouse', slug: 'acme' },
    { vendor: 'lever', slug: 'acme' },
  ]);
});

test('guessBoards tries joined and hyphenated forms of a multi-word name', () => {
  const slugs = new Set(guessBoards('Scale AI').map((b) => b.slug));
  assert.deepEqual([...slugs].sort(), ['scale-ai', 'scaleai']);
  assert.equal(guessBoards('Scale AI').length, 6);
});

test('guessBoards ignores names that cannot be slugs', () => {
  assert.deepEqual(guessBoards('!!!'), []);
  assert.deepEqual(guessBoards('x'.repeat(100)), []);
});

const roles = [
  'Applied AI Engineer',
  'Forward-Deployed Engineer',
  'Full Stack AI Engineer',
];

test('a title matches a role as whole words in order, ignoring case and hyphens', () => {
  assert.equal(titleMatchesRole('Forward Deployed Engineer', roles), true);
  assert.equal(titleMatchesRole('forward-deployed engineer', roles), true);
  assert.equal(
    titleMatchesRole(
      'Member of Technical Staff, Applied AI Engineer, Agent Capabilities',
      roles,
    ),
    true,
  );
  assert.equal(
    titleMatchesRole('AI Engineer - FDE (Forward Deployed Engineer)', roles),
    true,
  );
});

test('Engineering is not Engineer and unrelated titles do not match', () => {
  assert.equal(titleMatchesRole('Forward Deployed Engineering', roles), false);
  assert.equal(titleMatchesRole('Software Engineer, Platform', roles), false);
  assert.equal(titleMatchesRole('Account Executive', roles), false);
});

test('management and intern roles never match an engineer profile', () => {
  assert.equal(
    titleMatchesRole('Regional Director, Forward Deployed Engineer', roles),
    false,
  );
  assert.equal(
    titleMatchesRole('Forward Deployed Engineer Manager', roles),
    false,
  );
  assert.equal(
    titleMatchesRole('Head of Applied AI Engineer Hiring', roles),
    false,
  );
  assert.equal(titleMatchesRole('Applied AI Engineer Intern', roles), false);
});

test('a management role matches when the profile asks for one', () => {
  assert.equal(
    titleMatchesRole('Engineering Manager, Platform', ['Engineering Manager']),
    true,
  );
});
