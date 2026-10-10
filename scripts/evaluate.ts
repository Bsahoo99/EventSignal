import { readPublicPage } from '../lib/server/sources';
import { writeFileSync, mkdirSync } from 'node:fs';
const sources = [
  {
    name: 'Named-speaker conference announcement',
    url: 'https://blog.langchain.dev/introducing-interrupt-langchain-conference/',
  },
  {
    name: 'Sparse event listing',
    url: 'https://www.python.org/events/python-events/2118/',
  },
  {
    name: 'Event listing with possible rendering/access limits',
    url: 'https://lu.ma/sf',
  },
];
async function main() {
  const checks = [];
  for (const source of sources) {
    try {
      const page = await readPublicPage(source.url);
      checks.push({
        ...source,
        checkedAt: new Date().toISOString(),
        status: 'readable',
        finalUrl: page.url,
        characters: page.text.length,
        excerpt: page.text.includes('Join thought leaders')
          ? page.text.slice(
              page.text.indexOf('Join thought leaders'),
              page.text.indexOf('Join thought leaders') + 300,
            )
          : page.text.slice(0, 200),
        links: page.links.length,
        providerRun: 'not run — no credentials; quality validation pending',
        costUsd: 0,
      });
    } catch (error) {
      checks.push({
        ...source,
        checkedAt: new Date().toISOString(),
        status: 'retrieval limitation',
        limitation: error instanceof Error ? error.message : 'Read failed',
        providerRun: 'not run',
        costUsd: 0,
      });
    }
  }
  mkdirSync('docs/evaluation', { recursive: true });
  writeFileSync(
    'docs/evaluation/source-checks.json',
    JSON.stringify(checks, null, 2) + '\n',
  );
  console.log(checks.map(({ name, status }) => ({ name, status })));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
