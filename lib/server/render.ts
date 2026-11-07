import * as cheerio from 'cheerio';
import { resolveDestination, validateDestination } from './sources';

// Some careers pages build their job list with a script, so the plain page
// reader sees only "Loading...". This module reads such a page the way a
// browser shows it, for public company pages only, and turns the rendered
// links into job listings. It never signs in, stores cookies or downloads
// files.
export type Listing = { title: string; details: string[]; url: string };
export type Rendered = { url: string; html: string };
export type Renderer = (url: string) => Promise<Rendered>;

const MAX_LISTINGS = 300;
const JOB_LINK = /(position|job|opening|role|vacanc)/i;
const INDEX_PAGE = /^(careers|jobs|openings|positions|open-positions)$/i;
// Job board systems whose postings a careers page commonly links to.
const BOARD_HOSTS = new Set([
  'jobs.ashbyhq.com',
  'boards.greenhouse.io',
  'job-boards.greenhouse.io',
  'jobs.lever.co',
  'www.comeet.com',
  'apply.workable.com',
]);
const clean = (value: string) => value.replace(/\s+/g, ' ').trim();

// A listing is a link whose address looks like a job and whose text starts
// with the title. The other lines in the link (team, place) are kept as
// details, because pages do not say which line is the location.
export function listingsFromHtml(html: string, pageUrl: string): Listing[] {
  const $ = cheerio.load(html);
  const page = new URL(pageUrl);
  const seen = new Set<string>();
  const listings: Listing[] = [];
  $('a[href]').each((_, el) => {
    if (listings.length >= MAX_LISTINGS) return false;
    let url: URL;
    try {
      url = new URL($(el).attr('href')!, page);
    } catch {
      return;
    }
    if (url.protocol !== 'https:') return;
    if (url.hostname !== page.hostname && !BOARD_HOSTS.has(url.hostname))
      return;
    if (url.pathname === page.pathname && url.search === page.search) return;
    // A link on the site itself must look like a job. A link to a job board
    // system is a posting by its host, whatever the path says.
    if (url.hostname === page.hostname) {
      const segments = url.pathname.split('/').filter(Boolean);
      if (
        !JOB_LINK.test(url.pathname + url.search) ||
        (segments.length <= 1 &&
          !url.search &&
          INDEX_PAGE.test(segments[0] ?? ''))
      )
        return;
    }
    url.hash = '';
    if (seen.has(url.href)) return;

    const parts: string[] = [];
    $(el)
      .find('*')
      .each((__, child) => {
        if ($(child).children().length > 0) return;
        const text = clean($(child).text());
        if (text && text !== parts[parts.length - 1]) parts.push(text);
      });
    if (!parts.length) {
      const text = clean($(el).text());
      if (text) parts.push(text);
    }
    const title = (parts[0] ?? '').slice(0, 150);
    if (title.length < 3) return;
    seen.add(url.href);
    listings.push({
      title,
      details: parts.slice(1, 4).map((part) => part.slice(0, 100)),
      url: url.href,
    });
  });
  return listings;
}

// Renders one public https page in a headless browser. Returns undefined when
// the browser library is not installed. Every request the page makes must go
// to a public address, images and fonts are not loaded, and the final address
// must stay on the requested site.
export async function playwrightRenderer(): Promise<Renderer | undefined> {
  let chromium: typeof import('@playwright/test').chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    return undefined;
  }
  return async (raw) => {
    const start = validateDestination(raw);
    await resolveDestination(start.href);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        acceptDownloads: false,
        serviceWorkers: 'block',
        permissions: [],
      });
      const hostChecks = new Map<string, Promise<boolean>>();
      const publicHost = (url: URL) => {
        let check = hostChecks.get(url.hostname);
        if (!check) {
          check = resolveDestination(url.href).then(
            () => true,
            () => false,
          );
          hostChecks.set(url.hostname, check);
        }
        return check;
      };
      await context.route('**/*', async (route) => {
        const request = route.request();
        if (['image', 'media', 'font'].includes(request.resourceType()))
          return route.abort();
        try {
          const url = new URL(request.url());
          if (url.protocol !== 'https:' || !(await publicHost(url)))
            return route.abort();
        } catch {
          return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      await page.goto(start.href, {
        waitUntil: 'domcontentloaded',
        timeout: 20_000,
      });
      await page
        .waitForLoadState('networkidle', { timeout: 8_000 })
        .catch(() => {});
      await page
        .waitForFunction(
          () =>
            document.querySelectorAll(
              'a[href*="position"],a[href*="job"],a[href*="opening"]',
            ).length >= 3,
          undefined,
          { timeout: 8_000 },
        )
        .catch(() => {});
      const final = new URL(page.url());
      const bare = (host: string) => host.replace(/^www\./, '');
      if (
        final.protocol !== 'https:' ||
        bare(final.hostname) !== bare(start.hostname)
      )
        throw new Error('The rendered page left the requested site.');
      const html = await page.content();
      if (html.length > 3_000_000)
        throw new Error('Rendered page is too large.');
      return { url: final.href, html };
    } finally {
      await browser.close().catch(() => {});
    }
  };
}
