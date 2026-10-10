import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Budget, initializeBudget } from '../lib/server/budget';
import type { Dependencies } from '../lib/server/analysis';
export const eventText =
  'Agent Meetup on 2027-01-15. Speaker Ada Chen from Acme presents agents and evaluation in customer deployments.';
export const extraction = {
  eventName: 'Agent Meetup',
  eventDate: '2027-01-15',
  historical: false,
  entities: [
    {
      name: 'Ada Chen',
      company: 'Acme',
      relationship: 'speaker',
      quote:
        'Speaker Ada Chen from Acme presents agents and evaluation in customer deployments.',
      topics: ['agents', 'evaluation', 'customer deployments'],
      modality: 'unknown',
      historical: false,
      ambiguous: false,
    },
  ],
};
export function createTestDependencies(
  overrides: Partial<Dependencies> = {},
): Dependencies {
  const path = join(
    mkdtempSync(join(tmpdir(), 'eventsignal-test-')),
    'budget.sqlite',
  );
  initializeBudget(path);
  return {
    mode: 'owner',
    credentials: true,
    budget: new Budget(path),
    extract: async () => ({
      data: structuredClone(extraction),
      usage: { inputTokens: 1000, outputTokens: 500 },
    }),
    now: () => '2026-10-10T05:00:00.000Z',
    ...overrides,
  };
}
