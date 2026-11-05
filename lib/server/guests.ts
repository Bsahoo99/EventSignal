export type Guest = {
  name: string;
  company?: string;
  title?: string;
  line: string;
};
export type RoleCategory =
  'engineer' | 'founder' | 'investor' | 'recruiter' | 'other';

const NOISE = [
  /^\d[\d,.]*\s*(going|guests?|attending|others?)?$/i,
  /^contact the host$/i,
  /^report event$/i,
  /^guests who have not completed/i,
  /^hosted by\b/i,
  /^presented by\b/i,
];
const SEPARATOR = /\s[-–—|·•]\s/;

function parseHeadline(headline: string): { title?: string; company?: string } {
  const text = headline.trim();
  if (!text || text.startsWith('(')) return {};
  const at = text.match(/^(.*?)\s+at\s+(.+)$/i);
  const [title, company] = at
    ? [at[1], at[2]]
    : text.includes(',')
      ? [text.slice(0, text.indexOf(',')), text.slice(text.indexOf(',') + 1)]
      : [text, ''];
  const cleanCompany = company.replace(/\s*\([^)]*\)\s*$/, '').trim();
  return {
    title: title.trim() || undefined,
    company: cleanCompany || undefined,
  };
}

export function parseGuestList(text: string): {
  guests: Guest[];
  ignored: number;
} {
  const guests: Guest[] = [];
  const seen = new Set<string>();
  let ignored = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (NOISE.some((pattern) => pattern.test(line))) {
      ignored += 1;
      continue;
    }
    const split = line.split(SEPARATOR);
    const name = split[0].trim();
    if (name.length < 2 || name.length > 80) {
      ignored += 1;
      continue;
    }
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    guests.push({
      name,
      ...parseHeadline(split.slice(1).join(' - ')),
      line,
    });
  }
  return { guests, ignored };
}

export function categorizeRole(title: string): RoleCategory {
  const value = title.toLowerCase();
  if (/recruit|talent|sourcer|headhunt/.test(value)) return 'recruiter';
  if (
    /investor|ventures?\b|\bvc\b|capital|angel|general partner|\bpartner\b/.test(
      value,
    )
  )
    return 'investor';
  if (/co-?founder|\bfounder\b|\bceo\b|\bcto\b/.test(value)) return 'founder';
  if (/engineer|developer|programmer|scientist|researcher|devrel/.test(value))
    return 'engineer';
  return 'other';
}
