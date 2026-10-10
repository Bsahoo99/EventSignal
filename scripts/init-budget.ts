import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { initializeBudget } from '../lib/server/budget';
const path = resolve(process.env.EVENTSIGNAL_LEDGER ?? '.local/budget.sqlite');
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
initializeBudget(path);
console.log(
  'Initialized local $8 development ledger. Existing ledgers are never reset.',
);
