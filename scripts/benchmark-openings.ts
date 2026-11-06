import { readFileSync } from 'node:fs';
import { runOpeningsBenchmark, type Snapshot } from '../benchmarks/openings';

const path =
  process.argv.slice(2).find((a) => !a.startsWith('--')) ??
  'benchmarks/boards-2026-11-06.json';
const snapshot = JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
const pct = (n: number | null) =>
  n === null ? 'n/a' : `${(n * 100).toFixed(0)}%`;
const verbose = process.argv.includes('--verbose');

async function main() {
  for (const r of await runOpeningsBenchmark(snapshot)) {
    console.log(`\n${r.scenario}`);
    console.log(
      `  companies ${r.companies}, verified ${r.verified}: ` +
        `${r.truePositive} correct, ${r.falsePositive} wrong, ${r.unscored} unscored; ` +
        `${r.falseNegative} missed`,
    );
    console.log(`  precision ${pct(r.precision)}, recall ${pct(r.recall)}`);
    for (const row of r.rows)
      if (
        verbose
          ? row.note
          : row.verdict === 'false-positive' || row.verdict === 'false-negative'
      )
        console.log(`  - ${row.verdict} ${row.company}: ${row.note ?? ''}`);
  }
}
main();
