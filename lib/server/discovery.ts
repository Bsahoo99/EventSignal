import type { Recommendation } from '../contracts';
import {
  validateDestination,
  type PageReader,
  type SourcePage,
} from './sources';

export type SearchHit = { title: string; url: string; description: string };
export type Searcher = (query: string) => Promise<SearchHit[]>;
export class ResearchLimitError extends Error {}
type Status = NonNullable<Recommendation['research']>['status'];
type Selection = { page: SourcePage } | { status: Status; message: string };
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const hostname = (url: string) => new URL(url).hostname.replace(/^www\./, '');
function identityMatches(company: string, page: SourcePage) {
  const names = [
    page.title ?? '',
    ...(page.title ?? '').split(/\s[-–—]\s|[|:]/),
    ...(page.siteNames ?? []),
  ];
  return names.some((name) => normalize(name) === normalize(company));
}
function brandMatches(company: string, url: string) {
  const brand = normalize(hostname(url).split('.')[0]);
  return (
    brand === normalize(company) ||
    (/\sAI$/i.test(company) &&
      brand === normalize(company.replace(/\sAI$/i, '')))
  );
}
function contextMatches(rec: Recommendation, page: SourcePage) {
  const terms = (rec.eventRole ? [rec.eventRole] : (rec.topics ?? []))
    .join(' ')
    .toLowerCase()
    .replace(/\bevals?\b/g, 'evaluation')
    .replace(/\bagents\b/g, 'agent')
    .split(/[^a-z0-9]+/)
    .filter(
      (t) =>
        t.length >= 4 &&
        ![
          'senior',
          'engineer',
          'manager',
          'founding',
          'global',
          'solution',
          'designer',
          'product',
          'marketing',
        ].includes(t),
    );
  return terms.some((term) => page.text.toLowerCase().includes(term));
}
export async function discoverCompany(
  rec: Recommendation,
  event: SourcePage,
  read: PageReader,
  search?: Searcher,
  suppliedWebsite?: string,
): Promise<Selection> {
  const company =
    rec.company ||
    (['presenting-company', 'hiring-partner'].includes(rec.relationshipKind)
      ? rec.name
      : '');
  const manual =
    'Add or correct its official URL under Company websites and analyze again.';
  if (!company)
    return {
      status: 'site-not-found',
      message: `No company affiliation established for ${rec.name}. ${manual}`,
    };
  const linked = event.links.find((link) => {
    try {
      return (
        normalize(link.label).includes(normalize(company)) &&
        brandMatches(company, link.url)
      );
    } catch {
      return false;
    }
  });
  if (suppliedWebsite || linked) {
    try {
      const url = suppliedWebsite || linked!.url;
      validateDestination(url);
      const page = await read(url);
      if (hostname(page.url) !== hostname(url))
        return {
          status: 'site-ambiguous',
          message: `The website redirected to a different company domain. ${manual}`,
        };
      if (!identityMatches(company, page))
        return {
          status: 'site-ambiguous',
          message: `The website did not establish ${company}'s identity. ${manual}`,
        };
      return { page };
    } catch (error) {
      return {
        status:
          error instanceof ResearchLimitError
            ? 'research-limited'
            : 'site-unreadable',
        message: `The company website could not be checked within this run. ${manual}`,
      };
    }
  }
  if (!search)
    return {
      status: 'search-unavailable',
      message: `Website discovery is unavailable. Configure BRAVE_SEARCH_API_KEY on the local server, or add ${company}'s official URL under Company websites.`,
    };
  let hits: SearchHit[];
  try {
    const context = rec.eventRole || (rec.topics ?? []).slice(0, 3).join(' ');
    hits = await search(
      `"${company.replaceAll('"', '')}" official company website careers ${context}`.slice(
        0,
        400,
      ),
    );
  } catch (error) {
    return {
      status:
        error instanceof ResearchLimitError
          ? 'research-limited'
          : 'search-unavailable',
      message:
        error instanceof ResearchLimitError
          ? `Research stopped at the time, request, or budget limit. ${manual}`
          : `Website search failed. Check the Brave key/quota, or supply the official company URL.`,
    };
  }
  const candidates = new Map<string, string>();
  for (const hit of hits.slice(0, 5)) {
    try {
      const url = validateDestination(hit.url);
      if (brandMatches(company, url.href))
        candidates.set(hostname(url.href), url.origin + '/');
    } catch {}
  }
  if (candidates.size > 2)
    return {
      status: 'site-ambiguous',
      message: `Several company domains could match ${company}. ${manual}`,
    };
  const matches: SourcePage[] = [];
  let unreadable = false;
  for (const url of candidates.values()) {
    try {
      const page = await read(url);
      if (
        hostname(page.url) === hostname(url) &&
        identityMatches(company, page) &&
        contextMatches(rec, page)
      )
        matches.push(page);
    } catch (error) {
      if (error instanceof ResearchLimitError)
        return {
          status: 'research-limited',
          message: `Research stopped before company identity could be resolved. ${manual}`,
        };
      unreadable = true;
    }
  }
  if (matches.length === 1 && !unreadable) return { page: matches[0] };
  return {
    status: unreadable
      ? 'site-unreadable'
      : candidates.size
        ? 'site-ambiguous'
        : 'site-not-found',
    message: unreadable
      ? `Candidate company pages could not all be read; identity remains unverified. ${manual}`
      : `Search did not establish a unique website matching ${company} and its event context. ${manual}`,
  };
}
