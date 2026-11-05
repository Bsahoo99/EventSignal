import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze } from '../lib/server/analysis';
import { geminiExtractor } from '../lib/server/model';
import { initialProfile } from '../lib/profile';
import { createTestDependencies, eventText, extraction } from './fixtures';
test('missing output usage from the actual provider adapter retains the whole reservation', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () =>
    Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: JSON.stringify(extraction) }] },
        },
      ],
      usageMetadata: { promptTokenCount: 1000 },
    });
  const deps = createTestDependencies({
    extract: geminiExtractor('fixture-key'),
  });
  const result = await analyze(
    { profile: initialProfile, event: { kind: 'text', text: eventText } },
    deps,
  );
  assert.equal(result.ok, true);
  assert.equal(deps.budget.total(), 0.1);
});

test('complete provider totals include thinking when reconciling cost', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = async () =>
    Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: JSON.stringify(extraction) }] },
        },
      ],
      usageMetadata: {
        promptTokenCount: 1000,
        candidatesTokenCount: 1000,
        totalTokenCount: 2050,
      },
    });
  const deps = createTestDependencies({
    extract: geminiExtractor('fixture-key'),
  });
  const result = await analyze(
    { profile: initialProfile, event: { kind: 'text', text: eventText } },
    deps,
  );
  assert.equal(result.ok, true);
  assert.equal(deps.budget.total(), 0.001825);
});

test('one invalid extracted entity is dropped without discarding the valid ones', async (t) => {
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  const shortQuote = {
    ...extraction.entities[0],
    name: 'Raymmar',
    company: '',
    relationship: 'host',
    quote: 'Raymmar',
    topics: [],
  };
  globalThis.fetch = async () =>
    Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [
              {
                text: JSON.stringify({
                  ...extraction,
                  entities: [...extraction.entities, shortQuote],
                }),
              },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 1000,
        candidatesTokenCount: 1000,
        totalTokenCount: 2050,
      },
    });
  const deps = createTestDependencies({
    extract: geminiExtractor('fixture-key'),
  });
  const result = await analyze(
    { profile: initialProfile, event: { kind: 'text', text: eventText } },
    deps,
  );
  assert.equal(result.ok, true);
  assert.match(JSON.stringify(result), /Ada Chen/);
  assert.doesNotMatch(JSON.stringify(result), /Raymmar/);
});
