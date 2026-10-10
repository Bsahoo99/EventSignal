import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { Budget, initializeBudget } from '../lib/server/budget';
test('reservations survive restarts, and competing processes cannot exceed $8', async () => {
  const path = join(
    mkdtempSync(join(tmpdir(), 'eventsignal-budget-')),
    'budget.sqlite',
  );
  initializeBudget(path);
  const budget = new Budget(path);
  for (let i = 0; i < 79; i++) budget.reserve();
  const attempt = () =>
    new Promise<number | null>((resolve) => {
      const child = spawn(
        process.execPath,
        [
          '--import',
          'tsx',
          '-e',
          `const {Budget}=require('./lib/server/budget.ts');try{new Budget(process.argv[1]).reserve()}catch{process.exitCode=2}`,
          path,
        ],
        { stdio: 'ignore' },
      );
      child.on('exit', resolve);
    });
  const results = await Promise.all([attempt(), attempt(), attempt()]);
  assert.equal(results.filter((n) => n === 0).length, 1);
  assert.equal(new Budget(path).total(), 8);
  assert.throws(() => budget.reserve());
  assert.throws(() => initializeBudget(path));
});
test('missing and corrupt ledgers fail closed', () => {
  const path = join(
    mkdtempSync(join(tmpdir(), 'eventsignal-budget-')),
    'bad.sqlite',
  );
  assert.throws(() => new Budget(path).reserve());
  writeFileSync(path, 'broken');
  assert.throws(() => new Budget(path).reserve());
});
