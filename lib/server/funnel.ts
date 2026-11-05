import type { Evidence, Opening, Profile, Recommendation } from '../contracts';
import type { Budget } from './budget';
import { ResearchLimitError, type SearchHit, type Searcher } from './discovery';
import {
  boardsFromHits,
  guessBoards,
  publicBoardFetcher,
  titleMatchesRole,
  type BoardFetcher,
} from './boards';
import { researchOpenings } from './opportunities';
import type { Resolved } from './resolve';
import type { SearchCache } from './search';
import type { PageReader, SourcePage } from './sources';

export type CompanyLead = {
  company: string;
  people: Resolved[];
  status: NonNullable<Recommendation['research']>['status'] | 'not-researched';
  website?: string;
  opening?: Opening;
  description: string;
  evidence: Evidence[];
  checkedAt: string;
};
export type FunnelDeps = {
  read: PageReader;
  search: Searcher;
  searchCache?: SearchCache;
  budget: Budget;
  now: () => string;
  maxCompanies: number;
  deadlineMs?: number;
  maxReads?: number;
  boards?: BoardFetcher;
};

// Guests carry no event topics, so supply generic technology terms plus the
// owner's skills. The identity checks in discoverCompany still apply.
const GENERIC_TOPICS = [
  'software',
  'platform',
  'developers',
  'engineering',
  'technology',
];
const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function researchCompanies(
  resolved: Resolved[],
  profile: Profile,
  deps: FunnelDeps,
): Promise<{ leads: CompanyLead[]; skipped: string[] }> {
  const groups = new Map<string, { company: string; people: Resolved[] }>();
  for (const person of resolved) {
    const key = normalize(person.company);
    if (!key) continue;
    const group = groups.get(key) ?? { company: person.company, people: [] };
    group.people.push(person);
    groups.set(key, group);
  }
  const ordered = [...groups.values()]
    .map((group, index) => ({ group, index }))
    .sort(
      (a, b) =>
        b.group.people.length - a.group.people.length || a.index - b.index,
    )
    .map((entry) => entry.group);
  const chosen = ordered.slice(0, deps.maxCompanies);
  const skipped = ordered.slice(deps.maxCompanies).map((g) => g.company);

  const checkedAt = deps.now();
  const deadline = Date.now() + (deps.deadlineMs ?? 110_000);
  let reads = 0;
  const readCache = new Map<string, Promise<SourcePage>>();
  const boundedRead: PageReader = async (url) => {
    const key = new URL(url).href;
    const cached = readCache.get(key);
    if (cached) return cached;
    if (reads++ >= (deps.maxReads ?? 400) || Date.now() > deadline)
      throw new ResearchLimitError('Research limit reached');
    const pending = deps.read(url);
    readCache.set(key, pending);
    return pending;
  };
  const hitsByCompany = new Map<string, SearchHit[]>();
  const remember = (query: string, hits: SearchHit[]) => {
    const company = query.match(/^"([^"]+)"/)?.[1];
    if (company) hitsByCompany.set(normalize(company), hits);
    return hits;
  };
  const fetchBoard = deps.boards ?? publicBoardFetcher();
  const boundedSearch: Searcher = async (query) => {
    const cacheKey = `tavily:basic:v1:${query}`;
    const stored = deps.searchCache?.get(cacheKey, Date.parse(checkedAt));
    if (stored) return remember(query, stored);
    if (Date.now() > deadline)
      throw new ResearchLimitError('Research limit reached');
    let id: string;
    try {
      id = deps.budget.reserve();
    } catch {
      throw new ResearchLimitError('Budget limit reached');
    }
    let hits;
    try {
      hits = await deps.search(query);
    } catch (error) {
      deps.budget.settle(id);
      throw error;
    }
    deps.budget.settleSearch(id);
    deps.searchCache?.put(cacheKey, hits, Date.parse(checkedAt));
    return remember(query, hits);
  };
  const guestPage: SourcePage = {
    url: 'https://guest-list.invalid/',
    text: '',
    links: [],
    jobs: [],
  };

  // A matching opening on the company's own Ashby, Greenhouse or Lever board
  // counts as verified. The board slug and the posting's organization (when
  // the board names one) must both equal the company, and a title must match
  // one of the owner's roles, the same rule the careers page check uses.
  const verifyFromBoards = async (lead: CompanyLead) => {
    const seen = new Set<string>();
    const boards = [
      ...boardsFromHits(
        lead.company,
        hitsByCompany.get(normalize(lead.company)) ?? [],
      ),
      ...guessBoards(lead.company),
    ]
      .filter((board) => {
        const key = `${board.vendor}:${board.slug.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
    for (const board of boards) {
      if (Date.now() > deadline) return;
      let jobs;
      try {
        jobs = await fetchBoard(board);
      } catch {
        continue;
      }
      const match = jobs.find(
        (job) =>
          (!job.organization ||
            normalize(job.organization) === normalize(lead.company)) &&
          titleMatchesRole(job.title, profile.roles),
      );
      if (!match) continue;
      lead.evidence = [
        ...lead.evidence,
        {
          id: `board-${normalize(lead.company)}`,
          kind: 'official-job',
          title: `${lead.company}: ${match.title}`,
          excerpt: `The ${board.vendor} job board for ${lead.company} lists ${match.title}.`,
          entity: lead.company,
          url: match.url,
          checkedAt,
        },
      ];
      if (profile.constraints.trim()) {
        lead.status = 'constraints-unverified';
        return;
      }
      lead.status = 'verified-opening';
      lead.opening = {
        title: match.title,
        url: match.url,
        checkedAt,
        location: match.location,
      };
      return;
    }
  };

  const leads: CompanyLead[] = [];
  for (const [index, group] of chosen.entries()) {
    if (Date.now() > deadline) {
      skipped.push(group.company);
      continue;
    }
    const rec: Recommendation = {
      id: `company-${index}`,
      name: group.company,
      company: group.company,
      relationship: 'Guest at the event',
      relationshipKind: 'attendee',
      topics: [...GENERIC_TOPICS, ...profile.skills],
      modality: 'unknown',
      opportunity: { kind: 'exploratory' },
      fit: '',
      experience: '',
      uncertainties: [],
      introduction: '',
      questions: ['', '', ''],
      evidence: [],
    };
    try {
      const result = await researchOpenings(
        rec,
        guestPage,
        profile,
        boundedRead,
        checkedAt,
        { search: boundedSearch },
      );
      const research = result.recommendation.research;
      const opportunity = result.recommendation.opportunity;
      const lead: CompanyLead = {
        company: group.company,
        people: group.people,
        status: research?.status ?? 'not-researched',
        website: research?.website,
        opening:
          opportunity.kind === 'verified-opening'
            ? opportunity.opening
            : undefined,
        description:
          result.evidence.find((e) => e.kind === 'company-page')?.excerpt ?? '',
        evidence: result.evidence,
        checkedAt,
      };
      if (
        lead.status !== 'verified-opening' &&
        lead.status !== 'constraints-unverified'
      )
        await verifyFromBoards(lead);
      leads.push(lead);
    } catch {
      leads.push({
        company: group.company,
        people: group.people,
        status: 'site-unreadable',
        description: '',
        evidence: [],
        checkedAt,
      });
    }
  }
  leads.sort(
    (a, b) =>
      Number(b.status === 'verified-opening') -
        Number(a.status === 'verified-opening') ||
      b.people.length - a.people.length,
  );
  return { leads, skipped };
}
