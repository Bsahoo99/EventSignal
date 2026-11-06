// Benchmark for opening verification against real public job boards.
//
// The boards are saved snapshots (benchmarks/boards-*.json), so a run costs
// nothing and gives the same answer every time. The expected answers come from
// the labeling rules below, which are written the way a person reads a job
// list and deliberately share no code with the matcher being measured
// (titleMatchesRole, locationVerdict).
import { initialProfile } from '../lib/profile';
import type { BoardJob, BoardRef } from '../lib/server/boards';
import { Budget, initializeBudget } from '../lib/server/budget';
import { researchCompanies } from '../lib/server/funnel';
import type { Resolved } from '../lib/server/resolve';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type Snapshot = {
  capturedAt: string;
  boards: Record<string, BoardJob[]>;
};
export type Scenario = {
  name: string;
  // What the owner types in: cities and "remote". Empty means any location.
  locations: string[];
  // The same wish, written as a person would check it.
  cities: string[][];
  remote: boolean;
};
export const SCENARIOS: Scenario[] = [
  {
    name: 'San Francisco or remote',
    locations: ['San Francisco', 'remote'],
    cities: [['san francisco', 'sf']],
    remote: true,
  },
  {
    name: 'Bangalore',
    locations: ['Bangalore'],
    cities: [['bangalore', 'bengaluru']],
    remote: false,
  },
  {
    name: 'New York',
    locations: ['New York'],
    cities: [['new york', 'nyc']],
    remote: false,
  },
];

export type TitleLabel = 'relevant' | 'irrelevant' | 'ambiguous';
// The owner wants Applied AI Engineer, Forward-Deployed Engineer and
// Full Stack AI Engineer roles, as individual contributors.
export function labelTitle(title: string): TitleLabel {
  const t = title.toLowerCase();
  if (
    /\b(manager|director|head of|vp|vice president|intern|internship|new grad)\b/.test(
      t,
    )
  )
    return 'irrelevant';
  const forwardDeployed = /forward[- ]deployed|\bfde\b/.test(t);
  const applied = /applied ai/.test(t);
  const fullStackAi =
    /full[- ]?stack/.test(t) && /\b(ai|agent|agentic|llm|ml)\b/.test(t);
  if (!forwardDeployed && !applied && !fullStackAi) return 'irrelevant';
  // Roles that sound close but are a different job, or too vague to call.
  if (
    /research|scientist|architect|partner|sales|marketing|customer success/.test(
      t,
    )
  )
    return 'ambiguous';
  if (fullStackAi && !forwardDeployed && !applied) return 'ambiguous';
  return 'relevant';
}

export type LocationLabel = 'match' | 'elsewhere' | 'unclear';
export function labelLocation(
  location: string | undefined,
  scenario: Scenario,
): LocationLabel {
  if (!location?.trim()) return 'unclear';
  const l = location.toLowerCase();
  const named = scenario.cities.some((aliases) =>
    aliases.some((alias) => new RegExp(`\\b${alias}\\b`).test(l)),
  );
  if (named) return 'match';
  if (/\bremote\b/.test(l)) {
    if (!scenario.remote) return 'elsewhere';
    // Plain remote is open to everyone. Remote limited to a region is not
    // clearly open to this owner.
    const rest = l.replace(
      /\b(remote|fully|global|globally|worldwide|anywhere)\b/g,
      '',
    );
    return /[a-z]/.test(rest) ? 'unclear' : 'match';
  }
  if (/^(hybrid|in-office|office|distributed)$/.test(l.trim()))
    return 'unclear';
  return 'elsewhere';
}

export type CompanyRow = {
  company: string;
  outcome: 'verified' | 'near-miss' | 'none';
  opening?: BoardJob;
  // Jobs a person would accept: relevant title in a matching place.
  expected: number;
  verdict:
    | 'true-positive'
    | 'false-positive'
    | 'unscored'
    | 'false-negative'
    | 'true-negative';
  note?: string;
};
export type ScenarioResult = {
  scenario: string;
  companies: number;
  verified: number;
  truePositive: number;
  falsePositive: number;
  unscored: number;
  falseNegative: number;
  precision: number | null;
  recall: number | null;
  rows: CompanyRow[];
};

const hitFor = (ref: BoardRef) => ({
  title: 'jobs',
  description: 'Open positions',
  url:
    ref.vendor === 'ashby'
      ? `https://jobs.ashbyhq.com/${ref.slug}`
      : ref.vendor === 'greenhouse'
        ? `https://boards.greenhouse.io/${ref.slug}`
        : `https://jobs.lever.co/${ref.slug}`,
});
const person = (company: string): Resolved => ({
  name: 'Benchmark Person',
  company,
  title: 'Engineer',
  source: 'guest-list',
  category: 'engineer',
  evidence: {
    url: 'guest-list',
    quote: 'benchmark',
    checkedAt: '2026-11-06T00:00:00.000Z',
  },
});

export async function runOpeningsBenchmark(
  snapshot: Snapshot,
  scenarios: Scenario[] = SCENARIOS,
): Promise<ScenarioResult[]> {
  const ledger = join(mkdtempSync(join(tmpdir(), 'bench-')), 'budget.sqlite');
  initializeBudget(ledger);
  const results: ScenarioResult[] = [];
  for (const scenario of scenarios) {
    const rows: CompanyRow[] = [];
    for (const [key, jobs] of Object.entries(snapshot.boards)) {
      const [vendor, slug] = key.split(':') as [BoardRef['vendor'], string];
      const company = slug.replace(/^./, (c) => c.toUpperCase());
      const accepted = new Set(
        jobs
          .filter(
            (j) =>
              labelTitle(j.title) === 'relevant' &&
              labelLocation(j.location, scenario) === 'match',
          )
          .map((j) => j.url),
      );
      const out = await researchCompanies([person(company)], initialProfile, {
        read: async () => {
          throw new Error('offline');
        },
        search: async () => [hitFor({ vendor, slug })],
        boards: async (ref) => {
          const found =
            snapshot.boards[`${ref.vendor}:${ref.slug.toLowerCase()}`];
          if (!found) throw new Error('no such board');
          return found;
        },
        budget: new Budget(ledger),
        now: () => `${snapshot.capturedAt}T00:00:00.000Z`,
        maxCompanies: 1,
        locations: scenario.locations,
      });
      const lead = out.leads[0];
      const opening = lead?.opening
        ? jobs.find((j) => j.url === lead.opening!.url)
        : undefined;
      const verified = lead?.status === 'verified-opening' && !!opening;
      let verdict: CompanyRow['verdict'];
      let note: string | undefined;
      if (verified) {
        const title = labelTitle(opening!.title);
        const place = labelLocation(opening!.location, scenario);
        if (title === 'relevant' && place === 'match')
          verdict = 'true-positive';
        else if (title === 'ambiguous' || place === 'unclear')
          verdict = 'unscored';
        else verdict = 'false-positive';
        if (verdict !== 'true-positive')
          note = `${opening!.title} | ${opening!.location ?? '(no location)'} (title ${title}, place ${place})`;
      } else if (accepted.size > 0) {
        verdict = 'false-negative';
        note = [...accepted]
          .slice(0, 2)
          .map((url) => {
            const j = jobs.find((x) => x.url === url)!;
            return `${j.title} | ${j.location}`;
          })
          .join(' ;; ');
      } else verdict = 'true-negative';
      rows.push({
        company,
        outcome: verified ? 'verified' : lead?.nearMiss ? 'near-miss' : 'none',
        opening,
        expected: accepted.size,
        verdict,
        note,
      });
    }
    const count = (v: CompanyRow['verdict']) =>
      rows.filter((r) => r.verdict === v).length;
    const tp = count('true-positive');
    const fp = count('false-positive');
    const fn = count('false-negative');
    results.push({
      scenario: scenario.name,
      companies: rows.length,
      verified: rows.filter((r) => r.outcome === 'verified').length,
      truePositive: tp,
      falsePositive: fp,
      unscored: count('unscored'),
      falseNegative: fn,
      precision: tp + fp ? tp / (tp + fp) : null,
      recall: tp + fn ? tp / (tp + fn) : null,
      rows,
    });
  }
  return results;
}
