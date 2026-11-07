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

// Which addresses the browser may reach. The default allows only public
// https hosts. Tests pass a policy for a local server.
export type NetworkPolicy = {
  start(raw: string): URL;
  allows(url: URL): Promise<boolean>;
};
export const publicHttpsPolicy: NetworkPolicy = {
  start: (raw) => validateDestination(raw),
  allows: async (url) =>
    url.protocol === 'https:' &&
    (await resolveDestination(url.href).then(
      () => true,
      () => false,
    )),
};
const MAX_HOPS = 3;
const MAX_BODY = 5_000_000;
const bare = (host: string) => host.replace(/^www\./, '');

// Renders one public page in a headless browser. Returns undefined when the
// browser library is not installed.
//
// The browser's own redirect handling is not trusted: Playwright's request
// hook does not see redirect hops. So every request is fetched by this code,
// one hop at a time, and each address is checked against the policy before it
// is requested. Images, media and fonts are not loaded, WebSockets are closed,
// a navigation of the page itself may not leave the requested site, and the
// final address must stay on that site.
//
// Residual risk: an address is checked just before it is fetched, so a host
// that changes its DNS answer between the check and the fetch is not caught.
// For a hosted deployment run this behind an egress proxy or a sandbox.
export async function playwrightRenderer(
  options: { policy?: NetworkPolicy } = {},
): Promise<Renderer | undefined> {
  const policy = options.policy ?? publicHttpsPolicy;
  let chromium: typeof import('@playwright/test').chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    return undefined;
  }
  return async (raw) => {
    const start = policy.start(raw);
    if (!(await policy.allows(start)))
      throw new Error('That address is not allowed.');
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        acceptDownloads: false,
        serviceWorkers: 'block',
        permissions: [],
      });
      await context.routeWebSocket(/.*/, (socket) => {
        void socket.close();
      });
      await context.route('**/*', async (route) => {
        const request = route.request();
        if (['image', 'media', 'font'].includes(request.resourceType()))
          return route.abort();
        try {
          let current = new URL(request.url());
          for (let hop = 0; hop <= MAX_HOPS; hop++) {
            if (!(await policy.allows(current))) return route.abort();
            const response = await route.fetch({
              url: current.href,
              maxRedirects: 0,
              timeout: 15_000,
            });
            const location = response.headers()['location'];
            if (
              response.status() >= 300 &&
              response.status() < 400 &&
              location
            ) {
              current = new URL(location, current);
              continue;
            }
            const body = await response.body();
            if (body.length > MAX_BODY) return route.abort();
            const pageItself =
              request.isNavigationRequest() && !request.frame().parentFrame();
            if (pageItself && bare(current.hostname) !== bare(start.hostname))
              return route.abort();
            return route.fulfill({ response, body });
          }
          return route.abort();
        } catch {
          return route.abort();
        }
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
      if (bare(final.hostname) !== bare(start.hostname))
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
