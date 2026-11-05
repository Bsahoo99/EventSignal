import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  geminiCompletion,
  openAiCompatibleCompletion,
  selectCompletion,
} from '../lib/server/llm';

const schema = { type: 'object', properties: { ok: { type: 'boolean' } } };
const request = { system: 'You extract.', user: '{"name":"Dana"}', schema };

type Captured = { url: string; init: RequestInit };
function stubFetch(
  t: { after: (fn: () => void) => void },
  reply: () => Response,
) {
  const original = globalThis.fetch;
  const captured: Captured[] = [];
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    captured.push({ url: String(url), init });
    return reply();
  }) as typeof fetch;
  return captured;
}

test('gemini completion sends system, user and schema and maps usage', async (t) => {
  const captured = stubFetch(t, () =>
    Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: '{"ok":true}' }] },
        },
      ],
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 20,
        totalTokenCount: 130,
      },
    }),
  );
  const out = await geminiCompletion('fixture-key')(request);
  assert.deepEqual(out.data, { ok: true });
  assert.deepEqual(out.usage, { inputTokens: 100, outputTokens: 30 });
  const body = JSON.parse(String(captured[0].init.body));
  assert.equal(body.systemInstruction.parts[0].text, 'You extract.');
  assert.equal(body.contents[0].parts[0].text, '{"name":"Dana"}');
  assert.deepEqual(body.generationConfig.responseJsonSchema, schema);
  assert.match(captured[0].url, /gemini-3\.1-flash-lite:generateContent$/);
  assert.equal(
    (captured[0].init.headers as Record<string, string>)['x-goog-api-key'],
    'fixture-key',
  );
});

test('gemini completion throws on a rejected request', async (t) => {
  stubFetch(t, () => new Response('no', { status: 403 }));
  await assert.rejects(() => geminiCompletion('k')(request), /rejected/i);
});

test('gemini completion throws when the output is incomplete', async (t) => {
  stubFetch(t, () =>
    Response.json({
      candidates: [
        { finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{' }] } },
      ],
    }),
  );
  await assert.rejects(() => geminiCompletion('k')(request), /incomplete/i);
});

test('openai-compatible completion targets chat/completions and maps usage', async (t) => {
  const captured = stubFetch(t, () =>
    Response.json({
      choices: [{ finish_reason: 'stop', message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 50, completion_tokens: 10 },
    }),
  );
  const out = await openAiCompatibleCompletion({
    baseUrl: 'http://localhost:11434/v1/',
    model: 'llama3.1',
  })(request);
  assert.deepEqual(out.data, { ok: true });
  assert.deepEqual(out.usage, { inputTokens: 50, outputTokens: 10 });
  assert.equal(captured[0].url, 'http://localhost:11434/v1/chat/completions');
  const body = JSON.parse(String(captured[0].init.body));
  assert.equal(body.model, 'llama3.1');
  assert.equal(body.messages[0].role, 'system');
  assert.equal(body.messages[1].content, '{"name":"Dana"}');
  assert.deepEqual(body.response_format.json_schema.schema, schema);
  const headers = captured[0].init.headers as Record<string, string>;
  assert.equal(headers.authorization, undefined);
});

test('openai-compatible completion sends a bearer key only when one is given', async (t) => {
  const captured = stubFetch(t, () =>
    Response.json({
      choices: [{ finish_reason: 'stop', message: { content: '{}' } }],
    }),
  );
  await openAiCompatibleCompletion({
    baseUrl: 'https://example.test/v1',
    model: 'm',
    apiKey: 'secret',
  })(request);
  const headers = captured[0].init.headers as Record<string, string>;
  assert.equal(headers.authorization, 'Bearer secret');
});

test('openai-compatible completion throws on non-OK and on non-JSON content', async (t) => {
  stubFetch(t, () => new Response('x', { status: 500 }));
  const make = () =>
    openAiCompatibleCompletion({
      baseUrl: 'http://localhost:1/v1',
      model: 'm',
    });
  await assert.rejects(() => make()(request), /rejected/i);
  const original = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = original;
  });
  globalThis.fetch = (async () =>
    Response.json({
      choices: [{ finish_reason: 'stop', message: { content: 'not json' } }],
    })) as typeof fetch;
  await assert.rejects(() => make()(request));
});

test('selectCompletion defaults to metered gemini and needs a key', () => {
  const picked = selectCompletion({ GEMINI_API_KEY: 'k' });
  assert.equal(picked.billing, 'metered');
  assert.match(picked.label, /gemini/);
  assert.throws(() => selectCompletion({}), /GEMINI_API_KEY/);
});

test('selectCompletion treats a loopback openai-compatible host as free', () => {
  const picked = selectCompletion({
    EVENTSIGNAL_PROVIDER: 'openai-compatible',
    EVENTSIGNAL_LLM_BASE_URL: 'http://localhost:11434/v1',
    EVENTSIGNAL_LLM_MODEL: 'llama3.1',
  });
  assert.equal(picked.billing, 'free');
  assert.match(picked.label, /llama3\.1/);
});

test('selectCompletion meters a remote openai-compatible host', () => {
  const picked = selectCompletion({
    EVENTSIGNAL_PROVIDER: 'openai-compatible',
    EVENTSIGNAL_LLM_BASE_URL: 'https://my-app.modal.run/v1',
    EVENTSIGNAL_LLM_MODEL: 'qwen',
  });
  assert.equal(picked.billing, 'metered');
});

test('selectCompletion fails clearly on missing settings or an unknown provider', () => {
  assert.throws(
    () => selectCompletion({ EVENTSIGNAL_PROVIDER: 'openai-compatible' }),
    /EVENTSIGNAL_LLM_BASE_URL/,
  );
  assert.throws(
    () =>
      selectCompletion({
        EVENTSIGNAL_PROVIDER: 'openai-compatible',
        EVENTSIGNAL_LLM_BASE_URL: 'http://localhost:1/v1',
      }),
    /EVENTSIGNAL_LLM_MODEL/,
  );
  assert.throws(
    () => selectCompletion({ EVENTSIGNAL_PROVIDER: 'carrier-pigeon' }),
    /carrier-pigeon/,
  );
});
