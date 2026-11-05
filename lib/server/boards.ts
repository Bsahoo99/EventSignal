import { z } from 'zod';
import type { SearchHit } from './discovery';

// Job boards on Ashby, Greenhouse and Lever expose documented public APIs for
// embedding their postings. Hosts are fixed, slugs are validated, and nothing
// here sends credentials.
export type BoardRef = {
  vendor: 'ashby' | 'greenhouse' | 'lever';
  slug: string;
};
export type BoardJob = {
  title: string;
  url: string;
  location?: string;
  organization?: string;
};
export type BoardFetcher = (board: BoardRef) => Promise<BoardJob[]>;

const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
const MAX_BYTES = 3_000_000;
const MAX_JOBS = 500;
const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

function vendorFor(host: string): BoardRef['vendor'] | undefined {
  if (host === 'jobs.ashbyhq.com') return 'ashby';
  if (/^(job-)?boards(\.eu)?\.greenhouse\.io$/.test(host)) return 'greenhouse';
  if (/^jobs(\.eu)?\.lever\.co$/.test(host)) return 'lever';
  return undefined;
}

export function boardsFromHits(company: string, hits: SearchHit[]): BoardRef[] {
  const boards: BoardRef[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    let url: URL;
    try {
      url = new URL(hit.url);
    } catch {
      continue;
    }
    const vendor = vendorFor(url.hostname.toLowerCase());
    if (!vendor || !/^https?:$/.test(url.protocol)) continue;
    const slug = url.pathname.split('/').filter(Boolean)[0] ?? '';
    if (!SLUG.test(slug) || normalize(slug) !== normalize(company)) continue;
    const key = `${vendor}:${slug.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    boards.push({ vendor, slug });
    if (boards.length === 3) break;
  }
  return boards;
}

const text = z.string().max(500);
const ashby = z.object({
  jobs: z.array(
    z.object({
      title: text,
      jobUrl: z.string().max(2000),
      location: text.optional(),
      isListed: z.boolean().optional(),
    }),
  ),
});
const greenhouse = z.object({
  jobs: z.array(
    z.object({
      title: text,
      absolute_url: z.string().max(2000),
      location: z.object({ name: text }).optional(),
      company_name: text.optional(),
    }),
  ),
});
const lever = z.array(
  z.object({
    text,
    hostedUrl: z.string().max(2000),
    categories: z.object({ location: text.optional() }).optional(),
  }),
);

async function readJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty board response.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_BYTES) throw new Error('Board response too large.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}

export function publicBoardFetcher(): BoardFetcher {
  return async ({ vendor, slug }) => {
    if (!SLUG.test(slug)) throw new Error('Invalid board slug.');
    const url =
      vendor === 'ashby'
        ? `https://api.ashbyhq.com/posting-api/job-board/${slug}`
        : vendor === 'greenhouse'
          ? `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`
          : `https://api.lever.co/v0/postings/${slug}?mode=json`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok)
      throw new Error(`Board request failed (${response.status}).`);
    const raw = await readJson(response);
    let jobs: BoardJob[];
    if (vendor === 'ashby')
      jobs = ashby
        .parse(raw)
        .jobs.filter((j) => j.isListed !== false)
        .map((j) => ({ title: j.title, url: j.jobUrl, location: j.location }));
    else if (vendor === 'greenhouse')
      jobs = greenhouse.parse(raw).jobs.map((j) => ({
        title: j.title,
        url: j.absolute_url,
        location: j.location?.name,
        organization: j.company_name,
      }));
    else
      jobs = lever.parse(raw).map((j) => ({
        title: j.text,
        url: j.hostedUrl,
        location: j.categories?.location,
      }));
    return jobs
      .slice(0, MAX_JOBS)
      .map(
        (j) =>
          Object.fromEntries(
            Object.entries(j).filter(([, v]) => v !== undefined),
          ) as BoardJob,
      );
  };
}
