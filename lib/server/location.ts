// Decides whether a job's listed location is one the owner asked for.
// Precision first: a job is a match only when its location text names a wanted
// city as whole words, or is plainly remote and the owner listed remote.
// A missing location, or remote with a region limit, is unknown and never a
// match. Everything else is elsewhere.
export type LocationVerdict = 'match' | 'elsewhere' | 'unknown';

const tokens = (value: string) =>
  value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

// Well-known alternate names for the same city. Short forms that are also
// state codes or common words are left out on purpose.
const ALIASES: string[][] = [
  ['bangalore', 'bengaluru'],
  ['new york', 'new york city', 'nyc'],
  ['san francisco', 'sf'],
  ['mumbai', 'bombay'],
  ['gurgaon', 'gurugram'],
];
const REMOTE_FILLER = new Set([
  'remote',
  'fully',
  'work',
  'from',
  'home',
  'anywhere',
  'worldwide',
  'global',
  'globally',
  'flexible',
]);

const contains = (haystack: string[], phrase: string[]) => {
  if (phrase.length === 0) return false;
  for (let i = 0; i + phrase.length <= haystack.length; i++)
    if (phrase.every((word, j) => haystack[i + j] === word)) return true;
  return false;
};

export function locationVerdict(
  location: string | undefined,
  wanted: string[],
): LocationVerdict {
  const wants = wanted.map((w) => w.trim()).filter(Boolean);
  if (wants.length === 0) return 'match';
  const words = tokens(location ?? '');
  if (words.length === 0) return 'unknown';

  const wantsRemote = wants.some((w) => tokens(w).includes('remote'));
  const phrases = wants
    .filter((w) => !tokens(w).includes('remote'))
    .flatMap((w) => {
      const text = tokens(w).join(' ');
      const group = ALIASES.find((names) => names.includes(text));
      return (group ?? [text]).map((name) => name.split(' '));
    });
  if (phrases.some((phrase) => contains(words, phrase))) return 'match';

  if (words.includes('remote') && wantsRemote)
    return words.every((word) => REMOTE_FILLER.has(word)) ? 'match' : 'unknown';
  return 'elsewhere';
}
