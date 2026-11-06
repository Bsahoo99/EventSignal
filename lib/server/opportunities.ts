import { z } from 'zod';
import * as cheerio from 'cheerio';
import type { Profile, Recommendation, Evidence } from '../contracts';
import type { SourcePage, PageReader } from './sources';
import {
  discoverCompany,
  ResearchLimitError,
  type Searcher,
} from './discovery';
const jobSchema = z.object({
  title: z.string().min(1).max(200),
  hiringOrganization: z.object({ name: z.string() }),
  validThrough: z.string().optional(),
  description: z.string().max(50000).optional(),
  jobLocation: z
    .object({
      address: z.object({
        addressLocality: z.string().optional(),
        addressRegion: z.string().optional(),
      }),
    })
    .optional(),
});
const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');
const closedPattern =
  /\b(no longer (accepting|available)|(?:position|job|role) (?:(?:is|was|has been|is now) )?(?:closed|filled|expired)|applications (?:(?:are|are now|have been) )?closed)\b/i;
function roleClosed(page: SourcePage, title: string) {
  const clauses = page.text.split(/(?<=[.!?])\s+|[;\n]/);
  return clauses.some((clause, index) => {
    if (!clause.toLowerCase().includes(title.toLowerCase())) return false;
    const next = clauses[index + 1] ?? '';
    return (
      closedPattern.test(clause) ||
      (/^(this (position|job|role)|applications)\b/i.test(next.trim()) &&
        closedPattern.test(next))
    );
  });
}
const host = (url: string) => new URL(url).hostname.replace(/^www\./, '');
const plain = (value: string) =>
  cheerio.load(value).text().replace(/\s+/g, ' ').trim();
function trustedCareerLink(
  link: { label: string; url: string },
  companyHost: string,
) {
  try {
    const hostname = host(link.url);
    return (
      /career|jobs|openings|positions/i.test(
        link.label + ' ' + new URL(link.url).pathname,
      ) &&
      (hostname === companyHost ||
        [
          'jobs.ashbyhq.com',
          'boards.greenhouse.io',
          'job-boards.greenhouse.io',
          'jobs.lever.co',
        ].includes(hostname))
    );
  } catch {
    return false;
  }
}
export async function researchOpenings(
  rec: Recommendation,
  event: SourcePage,
  profile: Profile,
  read: PageReader,
  checkedAt: string,
  options: { search?: Searcher; website?: string } = {},
): Promise<{
  recommendation: Recommendation;
  evidence: Evidence[];
  warning?: string;
}> {
  const company =
    rec.company ||
    (rec.relationshipKind === 'presenting-company' ||
    rec.relationshipKind === 'hiring-partner'
      ? rec.name
      : '');
  const selection = await discoverCompany(
    rec,
    event,
    read,
    options.search,
    options.website,
  );
  if (!('page' in selection))
    return {
      recommendation: { ...rec, research: { ...selection, checkedAt } },
      evidence: [],
      warning: `${rec.name}: ${selection.message}`,
    };
  const home = selection.page;
  const research = (
    status: NonNullable<Recommendation['research']>['status'],
    message: string,
  ) => ({ status, message, website: home.url, checkedAt });
  const evidence: Evidence[] = [];
  try {
    const context = home.text
      .split(/(?<=[.!?])\s+/)
      .find(
        (sentence) =>
          sentence.toLowerCase().includes(company.toLowerCase()) &&
          sentence.length < 500,
      );
    if (context)
      evidence.push({
        id: `company-${rec.id}`,
        kind: 'company-page',
        title: `${company} company context`,
        excerpt: context,
        entity: company,
        url: home.url,
        checkedAt,
      });
    // A link to another part of a page already read (#main-content, #search)
    // is the same page, so it must not use up the page limit.
    const withoutFragment = (value: string) => {
      try {
        const url = new URL(value);
        url.hash = '';
        return url.href;
      } catch {
        return value;
      }
    };
    const pages = [home];
    const visited = new Set([withoutFragment(home.url)]);
    let incomplete = false;
    let limited = false;
    for (let index = 0; index < pages.length; index++) {
      const careers = pages[index].links.filter((l) =>
        trustedCareerLink(l, host(home.url)),
      );
      for (const career of careers) {
        const target = withoutFragment(career.url);
        if (visited.has(target)) continue;
        if (visited.size >= 4 || limited) {
          limited = true;
          continue;
        }
        visited.add(target);
        try {
          const page = await read(target);
          if (host(page.url) !== host(career.url))
            throw new Error(
              'Careers source redirected outside the established source domain.',
            );
          pages.push(page);
        } catch (error) {
          if (error instanceof ResearchLimitError) limited = true;
          else incomplete = true;
        }
      }
    }
    for (const page of pages) {
      for (const raw of page.jobs) {
        const parsed = jobSchema.safeParse(raw);
        if (!parsed.success) continue;
        const job = parsed.data;
        if (pages.some((other) => roleClosed(other, job.title))) continue;
        if (
          normalize(job.hiringOrganization.name) !== normalize(company) ||
          !page.text.toLowerCase().includes(job.title.toLowerCase())
        )
          continue;
        if (
          job.validThrough &&
          (!Number.isFinite(Date.parse(job.validThrough)) ||
            Date.parse(job.validThrough) < Date.parse(checkedAt))
        )
          continue;
        if (
          !profile.roles.some((role) =>
            normalize(job.title).includes(normalize(role)),
          )
        )
          continue;
        const description = job.description
          ? plain(job.description)
          : undefined;
        const requirements =
          description && page.text.includes(description)
            ? description.slice(0, 1200)
            : undefined;
        const location = [
          job.jobLocation?.address.addressLocality,
          job.jobLocation?.address.addressRegion,
        ]
          .filter(Boolean)
          .join(', ');
        const jobEvidence: Evidence = {
          id: `job-${rec.id}`,
          kind: 'official-job',
          title: `${company}: ${job.title}`,
          excerpt: `The retrieved page lists ${job.title} for ${company}.${requirements ? ' ' + requirements : ''}`,
          entity: company,
          url: page.url,
          checkedAt,
        };
        evidence.push(jobEvidence);
        if (profile.constraints.trim())
          return {
            recommendation: {
              ...rec,
              research: research(
                'constraints-unverified',
                'An official role was found. Check your hard constraints before treating it as a match.',
              ),
              evidence: [...rec.evidence, ...evidence],
              uncertainties: [
                ...rec.uncertainties,
                'An official role was found, but your hard constraints have not been established. It is not promoted as a verified match.',
              ],
            },
            evidence,
            warning: `${company}: hard constraints require your manual check.`,
          };
        return {
          recommendation: {
            ...rec,
            research: research(
              'verified-opening',
              'Matching role found on an official company or company-linked careers page. Check the dated source before applying.',
            ),
            opportunity: {
              kind: 'verified-opening',
              opening: {
                title: job.title,
                url: page.url,
                checkedAt,
                requirements,
                location:
                  location && page.text.includes(location)
                    ? location
                    : undefined,
              },
            },
            fit: `An official listing matches your submitted target role (${job.title}). ${rec.fit}`,
            uncertainties: rec.uncertainties
              .filter((u) => !u.startsWith('No current opening'))
              .concat([
                'An official listing does not guarantee continued availability, candidate eligibility, or a referral.',
                ...(requirements
                  ? []
                  : [
                      'Role title supported; requirements were not established from readable page text.',
                    ]),
              ]),
            evidence: [...rec.evidence, ...evidence],
          },
          evidence,
          warning: limited
            ? `${company}: research stopped at the time or page limit; verification is limited to the recorded fields.`
            : incomplete
              ? `${company}: some detail pages were unreadable; verification is limited to the recorded fields.`
              : undefined,
        };
      }
    }
    return {
      recommendation: {
        ...rec,
        research: research(
          limited
            ? 'research-limited'
            : incomplete
              ? 'careers-unreadable'
              : 'no-matching-opening',
          limited
            ? 'Research stopped at the time or page limit. Open the company website to check additional roles manually.'
            : incomplete
              ? 'Some careers pages could not be read. Open the company website to check current roles manually.'
              : 'Company pages checked; no supported matching opening found in this limited search. Check the website for additional roles.',
        ),
        evidence: [...rec.evidence, ...evidence],
      },
      evidence,
      warning: `${company}: no supported matching opening found in the bounded pages checked. This does not mean the company is not hiring.`,
    };
  } catch {
    return {
      recommendation: {
        ...rec,
        research: research(
          'careers-unreadable',
          'Company website identified, but job verification could not finish. Open the website to check its careers page.',
        ),
        evidence: [...rec.evidence, ...evidence],
      },
      evidence,
      warning: `${company}: some official pages could not be read or the source limit was reached. Job verification is incomplete.`,
    };
  }
}
