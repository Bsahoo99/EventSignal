import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  labelLocation,
  labelTitle,
  runOpeningsBenchmark,
  SCENARIOS,
  type Snapshot,
} from '../benchmarks/openings';

const snapshot = JSON.parse(
  readFileSync('benchmarks/boards-2026-11-06.json', 'utf8'),
) as Snapshot;

// Targets set before the first run: what is called verified must be right
// (precision), and most companies that do have a fitting local opening must be
// found (recall).
const MIN_PRECISION = 0.9;
const MIN_RECALL = 0.7;

test('the snapshot covers enough real boards to mean something', () => {
  assert.ok(Object.keys(snapshot.boards).length >= 60);
});

test('verified openings on real boards are right in every scenario', async () => {
  const results = await runOpeningsBenchmark(snapshot);
  assert.equal(results.length, SCENARIOS.length);
  for (const r of results) {
    assert.ok(
      r.truePositive + r.falsePositive >= 2,
      `${r.scenario}: too few verified openings to score`,
    );
    assert.ok(
      (r.precision ?? 0) >= MIN_PRECISION,
      `${r.scenario}: precision ${r.precision}`,
    );
    assert.ok(
      (r.recall ?? 0) >= MIN_RECALL,
      `${r.scenario}: recall ${r.recall}`,
    );
  }
});

test('the labeling rules treat obvious cases the way a person would', () => {
  assert.equal(labelTitle('Forward Deployed Engineer'), 'relevant');
  assert.equal(
    labelTitle('Manager, Forward Deployed Engineering'),
    'irrelevant',
  );
  assert.equal(labelTitle('Applied AI Research Engineer'), 'ambiguous');
  assert.equal(labelTitle('Account Executive'), 'irrelevant');
  const sf = SCENARIOS[0];
  assert.equal(labelLocation('San Francisco, CA', sf), 'match');
  assert.equal(labelLocation('London', sf), 'elsewhere');
  assert.equal(labelLocation('Remote - US', sf), 'unclear');
  assert.equal(labelLocation(undefined, sf), 'unclear');
});
