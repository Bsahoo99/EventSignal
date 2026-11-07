import type { Evidence, Opening, Profile, Recommendation } from '../contracts';
import type { Budget } from './budget';
import { ResearchLimitError, type SearchHit, type Searcher } from './discovery';
import {
  boardsFromHits,
  guessBoards,
  publicBoardFetcher,
  titleMatchesRole,
  type BoardFetcher,
  type BoardJob,
  type BoardRef,
} from './boards';
import { locationVerdict, type LocationVerdict } from './location';
import { listingsFromHtml, type Renderer } from './render';
import { researchOpenings } from './opportunities';
import type { Resolved } from './resolve';
import type { SearchCache } from './search';
import type { PageReader, SourcePage } from './sources';

// A posting whose title matches the owner's roles but whose location is not a
// wanted one, or is not listed. It is shown as context and never as verified.
export type NearMiss = {
  title: string;
  url: string;
  location?: string;
  reason: 'elsewhere' | 'location-unknown';
};
export type CompanyLead = {
  company: string;
  people: Resolved[];
  status: NonNullable<Recommendation['research']>['status'] | 'not-researched';
  website?: string;
  opening?: Opening;
  nearMiss?: NearMiss;
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
  // Cities (and "remote") the owner wants. Empty or missing means any location.
  locations?: string[];
  // Reads careers pages that build their job list with a script. Optional.
  render?: Renderer;
  // Official websites the owner supplied, by company name.
  websites?: Record<string, string>;
  maxRenders?: number;
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
  // Counts stops caused by the run's own limits (time, page reads, budget), as
  // opposed to a single company's pages being too many to read.
  let limitStops = 0;
  const stop = (message: string): never => {
    limitStops += 1;
    throw new ResearchLimitError(message);
  };
  const boundedRead: PageReader = async (url) => {
    const key = new URL(url).href;
    const cached = readCache.get(key);
    if (cached) return cached;
    if (reads++ >= (deps.maxReads ?? 400) || Date.now() > deadline)
      return stop('Research limit reached');
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
    if (Date.now() > deadline) return stop('Research limit reached');
    let id: string;
    try {
      id = deps.budget.reserve();
    } catch {
      return stop('Budget limit reached');
    }
    let hits;
    try {
      hits = await deps.search(query);
    } catch (error) {
      deps.budget.settleUnknown(id, 8_000);
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

  const wanted = (deps.locations ?? []).map((l) => l.trim()).filter(Boolean);
  // Keep one near miss per company. A job with no listed location is kept in
  // preference to one in another place, since it may still be in a wanted one.
  const noteNearMiss = (
    lead: CompanyLead,
    job: { title: string; url: string; location?: string },
    verdict: 'elsewhere' | 'unknown',
  ) => {
    const reason = verdict === 'unknown' ? 'location-unknown' : 'elsewhere';
    if (
      lead.nearMiss &&
      !(lead.nearMiss.reason === 'elsewhere' && reason === 'location-unknown')
    )
      return;
    lead.nearMiss = {
      title: job.title,
      url: job.url,
      location: job.location,
      reason,
    };
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
    let match: BoardJob | undefined;
    let board: BoardRef | undefined;
    let boardRead = false;
    for (const candidate of boards) {
      if (Date.now() > deadline) break;
      let jobs;
      try {
        jobs = await fetchBoard(candidate);
      } catch {
        continue;
      }
      boardRead = true;
      for (const job of jobs) {
        if (
          (job.organization &&
            normalize(job.organization) !== normalize(lead.company)) ||
          !titleMatchesRole(job.title, profile.roles)
        )
          continue;
        const verdict = locationVerdict(job.location, wanted);
        if (verdict === 'match') {
          match = job;
          board = candidate;
          break;
        }
        noteNearMiss(lead, job, verdict);
      }
      if (match) break;
    }
    if (match && board) {
      lead.nearMiss = undefined;
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
    } else if (
      boardRead &&
      (lead.status === 'research-limited' ||
        lead.status === 'careers-unreadable')
    ) {
      // The company's own job board was read in full and holds no matching
      // role, which settles what the unreadable careers page could not.
      lead.status = 'no-matching-opening';
    }
  };

  // A role listed on the company's own careers page, read the way a browser
  // shows it. Same title and place rules as the job board check. At most two
  // pages per company and a capped number per run.
  const websiteHints = new Map(
    Object.entries(deps.websites ?? {}).map(([name, url]) => [
      normalize(name),
      url,
    ]),
  );
  let renders = 0;
  const bestVerdict = (details: string[]): LocationVerdict => {
    if (wanted.length === 0) return 'match';
    const verdicts = details.map((d) => locationVerdict(d, wanted));
    return verdicts.includes('match')
      ? 'match'
      : verdicts.includes('unknown') || verdicts.length === 0
        ? 'unknown'
        : 'elsewhere';
  };
  const verifyFromRendered = async (lead: CompanyLead) => {
    const base = lead.website ?? websiteHints.get(normalize(lead.company));
    if (!deps.render || !base) return;
    let origin: URL;
    try {
      origin = new URL(base);
    } catch {
      return;
    }
    if (origin.protocol !== 'https:') return;
    let listingsSeen = 0;
    for (const path of ['/careers', '/jobs']) {
      if (Date.now() > deadline || renders >= (deps.maxRenders ?? 12)) break;
      renders += 1;
      let rendered;
      try {
        rendered = await deps.render(`${origin.origin}${path}`);
      } catch {
        continue;
      }
      const listings = listingsFromHtml(rendered.html, rendered.url);
      listingsSeen += listings.length;
      for (const listing of listings) {
        if (!titleMatchesRole(listing.title, profile.roles)) continue;
        const verdict = bestVerdict(listing.details);
        const location =
          listing.details.find((d) => locationVerdict(d, wanted) === 'match') ??
          (listing.details.join(', ') || undefined);
        if (verdict !== 'match') {
          noteNearMiss(lead, { ...listing, location }, verdict);
          continue;
        }
        lead.nearMiss = undefined;
        lead.evidence = [
          ...lead.evidence,
          {
            id: `render-${normalize(lead.company)}`,
            kind: 'official-job',
            title: `${lead.company}: ${listing.title}`,
            excerpt: `The rendered careers page for ${lead.company} lists ${listing.title}${location ? ` (${location})` : ''}.`,
            entity: lead.company,
            url: listing.url,
            checkedAt,
          },
        ];
        if (profile.constraints.trim()) {
          lead.status = 'constraints-unverified';
          return;
        }
        lead.status = 'verified-opening';
        lead.opening = {
          title: listing.title,
          url: listing.url,
          checkedAt,
          location,
        };
        return;
      }
      if (listings.length) break;
    }
    if (
      listingsSeen > 0 &&
      (lead.status === 'research-limited' ||
        lead.status === 'careers-unreadable' ||
        lead.status === 'site-unreadable')
    )
      lead.status = 'no-matching-opening';
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
    const stopsBefore = limitStops;
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
      // An opening from the careers page also has to be in a wanted place.
      if (wanted.length && lead.status === 'verified-opening' && lead.opening) {
        const verdict = locationVerdict(lead.opening.location, wanted);
        if (verdict !== 'match') {
          noteNearMiss(lead, lead.opening, verdict);
          lead.opening = undefined;
          lead.status = 'no-matching-opening';
        }
      }
      // A careers page with too many postings to read stops research too, but
      // retrying cannot help. Only a stop caused by the run's own limits is
      // reported as research-limited.
      if (lead.status === 'research-limited' && limitStops === stopsBefore)
        lead.status = 'careers-unreadable';
      if (
        lead.status !== 'verified-opening' &&
        lead.status !== 'constraints-unverified'
      )
        await verifyFromBoards(lead);
      if (
        lead.status !== 'verified-opening' &&
        lead.status !== 'constraints-unverified'
      )
        await verifyFromRendered(lead);
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
