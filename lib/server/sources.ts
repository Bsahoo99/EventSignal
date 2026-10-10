import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import ipaddr from 'ipaddr.js';
import * as cheerio from 'cheerio';
export type SourcePage = {
  url: string;
  text: string;
  links: { label: string; url: string }[];
  jobs: unknown[];
  entries?: string[];
};
export type PageReader = (url: string) => Promise<SourcePage>;
export function validateDestination(raw: string) {
  const url = new URL(raw);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.local') ||
    url.hostname.endsWith('.localhost')
  )
    throw new Error(
      'Only public HTTPS pages on the default port are supported.',
    );
  return url;
}
export function publicAddress(address: string) {
  try {
    return ipaddr.process(address).range() === 'unicast';
  } catch {
    return false;
  }
}
export type DnsResolver = (
  hostname: string,
) => Promise<{ address: string; family: number }[]>;
export async function resolveDestination(
  raw: string,
  resolver: DnsResolver = (hostname) => lookup(hostname, { all: true }),
) {
  const url = validateDestination(raw);
  const records = await resolver(url.hostname.replace(/^\[|\]$/g, ''));
  if (
    !records.length ||
    records.some((record) => !publicAddress(record.address))
  )
    throw new Error('Private or special-purpose destination blocked.');
  return { url, address: records[0] };
}
type Destination = Awaited<ReturnType<typeof resolveDestination>>;
type PageResponse = {
  body: string;
  location?: string;
  status: number;
  type: string;
};
type Transport = (
  destination: Destination,
  timeout: number,
) => Promise<PageResponse>;
async function fetchPinned({ url, address }: Destination, timeout: number) {
  return new Promise<{
    body: string;
    location?: string;
    status: number;
    type: string;
  }>((resolve, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        headers: {
          'user-agent': 'EventSignal/0.1 (public evidence reader)',
          accept: 'text/html, text/plain, application/ld+json',
          'accept-encoding': 'identity',
        },
        lookup: (_hostname, _options, callback) =>
          callback(null, address.address, address.family),
        family: address.family,
      },
      (res) => {
        let bytes = 0;
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 250_000) {
            req.destroy(new Error('Page exceeds 250 KB.'));
            return;
          }
          chunks.push(chunk);
        });
        res.on('error', reject);
        res.on('end', () =>
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            location: res.headers.location,
            status: res.statusCode ?? 500,
            type: res.headers['content-type'] ?? '',
          }),
        );
      },
    );
    const timer = setTimeout(
      () => req.destroy(new Error('Page request timed out.')),
      timeout,
    );
    req.on('close', () => clearTimeout(timer));
    req.on('error', reject);
    req.end();
  });
}
export function parsePage(
  body: string,
  url: string,
  type = 'text/html',
): SourcePage {
  if (type.includes('text/plain'))
    return { url, text: body.slice(0, 20000), links: [], jobs: [] };
  const $ = cheerio.load(body);
  const jobs: unknown[] = [];
  function collect(value: unknown) {
    if (Array.isArray(value)) {
      value.slice(0, 30).forEach(collect);
      return;
    }
    if (!value || typeof value !== 'object') return;
    const object = value as Record<string, unknown>;
    if (
      object['@type'] === 'JobPosting' ||
      (Array.isArray(object['@type']) && object['@type'].includes('JobPosting'))
    )
      jobs.push(object);
    if (object['@graph']) collect(object['@graph']);
  }
  $('script[type="application/ld+json"]')
    .slice(0, 15)
    .each((_, el) => {
      try {
        collect(JSON.parse($(el).text()));
      } catch {}
    });
  const links: SourcePage['links'] = [];
  $('a[href]').each((_, el) => {
    if (links.length >= 60) return;
    try {
      const href = new URL($(el).attr('href')!, url);
      if (href.protocol === 'https:') {
        links.push({
          label: $(el).text().replace(/\s+/g, ' ').trim().slice(0, 150),
          url: href.href,
        });
      }
    } catch {}
  });
  $('script,style,noscript,iframe,svg,form').remove();
  const entries = $('li,p')
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, ' ').trim())
    .filter((text) => text.length > 0 && text.length <= 1200)
    .slice(0, 200);
  $('br,p,div,li,h1,h2,h3,h4,section,article').append(' ');
  return {
    url,
    text: $('body').text().replace(/\s+/g, ' ').trim().slice(0, 20000),
    links,
    jobs: jobs.slice(0, 20),
    entries,
  };
}
export function createPageReader(
  resolver: DnsResolver = (hostname) => lookup(hostname, { all: true }),
  transport: Transport = fetchPinned,
): PageReader {
  return async (raw) => {
    let url = raw;
    const deadline = Date.now() + 15_000;
    for (let redirects = 0; redirects <= 3; redirects++) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const destination = await Promise.race([
        resolveDestination(url, resolver),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('DNS timeout')),
            Math.min(3000, Math.max(1, deadline - Date.now())),
          );
        }),
      ]).finally(() => clearTimeout(timer));
      if (Date.now() >= deadline) throw new Error('Page deadline reached');
      const response = await transport(
        destination,
        Math.min(10_000, deadline - Date.now()),
      );
      if (
        response.status >= 300 &&
        response.status < 400 &&
        response.location
      ) {
        url = new URL(response.location, url).href;
        continue;
      }
      if (response.status !== 200)
        throw new Error('Public page is unavailable.');
      if (
        !/^(text\/html|text\/plain|application\/xhtml\+xml)(;|$)/i.test(
          response.type,
        )
      )
        throw new Error('Unsupported page format. Paste public text instead.');
      const page = parsePage(response.body, url, response.type);
      if (page.text.length < 20)
        throw new Error('Page has too little readable text.');
      return page;
    }
    throw new Error('Too many redirects.');
  };
}
export const readPublicPage = createPageReader();
