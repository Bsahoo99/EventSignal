import { MODEL } from './model';

export type CompletionRequest = {
  system: string;
  user: string;
  schema: Record<string, unknown>;
};
export type CompletionResponse = {
  data: unknown;
  usage?: { inputTokens: number; outputTokens: number };
};
export type Completion = (
  request: CompletionRequest,
) => Promise<CompletionResponse>;

const MAX_BODY_BYTES = 100_000;
const MAX_RESPONSE_BYTES = 200_000;

async function readBounded(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty provider response.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > MAX_RESPONSE_BYTES)
        throw new Error('Oversized provider response.');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return JSON.parse(Buffer.concat(chunks).toString());
}
function boundedBody(value: unknown) {
  const body = JSON.stringify(value);
  if (Buffer.byteLength(body) > MAX_BODY_BYTES)
    throw new Error('Provider input exceeds bounded request size.');
  return body;
}

export function geminiCompletion(key: string): Completion {
  return async ({ system, user, schema }) => {
    const body = boundedBody({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseJsonSchema: schema,
        maxOutputTokens: 4096,
      },
    });
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body,
        signal: AbortSignal.timeout(30_000),
      },
    );
    if (!response.ok)
      throw new Error(
        'Provider rejected the bounded request. Check model access and credentials.',
      );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await readBounded(response);
    if (raw.candidates?.[0]?.finishReason !== 'STOP')
      throw new Error('Incomplete provider output.');
    const data = JSON.parse(
      raw.candidates[0].content.parts
        .filter((p: { thought?: boolean }) => !p.thought)
        .map((p: { text?: string }) => p.text ?? '')
        .join(''),
    );
    const usage = raw.usageMetadata;
    const complete =
      usage &&
      [
        usage.promptTokenCount,
        usage.totalTokenCount,
        usage.candidatesTokenCount,
      ].every((value) => Number.isSafeInteger(value) && value >= 0) &&
      usage.totalTokenCount >=
        usage.promptTokenCount + usage.candidatesTokenCount;
    return {
      data,
      usage: complete
        ? {
            inputTokens: usage.promptTokenCount,
            outputTokens: usage.totalTokenCount - usage.promptTokenCount,
          }
        : undefined,
    };
  };
}

export function openAiCompatibleCompletion(options: {
  baseUrl: string;
  model: string;
  apiKey?: string;
}): Completion {
  const url = `${options.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  return async ({ system, user, schema }) => {
    const body = boundedBody({
      model: options.model,
      temperature: 0,
      max_tokens: 4096,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'answer', schema, strict: true },
      },
    });
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (options.apiKey) headers.authorization = `Bearer ${options.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error('Provider rejected the bounded request.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await readBounded(response);
    const choice = raw.choices?.[0];
    if (choice?.finish_reason !== 'stop')
      throw new Error('Incomplete provider output.');
    const data = JSON.parse(String(choice.message?.content ?? ''));
    const usage = raw.usage;
    const complete =
      usage &&
      Number.isSafeInteger(usage.prompt_tokens) &&
      Number.isSafeInteger(usage.completion_tokens) &&
      usage.prompt_tokens >= 0 &&
      usage.completion_tokens >= 0;
    return {
      data,
      usage: complete
        ? {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
          }
        : undefined,
    };
  };
}

export function selectCompletion(env: Record<string, string | undefined>): {
  completion: Completion;
  billing: 'metered' | 'free';
  label: string;
} {
  const provider = env.EVENTSIGNAL_PROVIDER || 'gemini';
  if (provider === 'gemini') {
    if (!env.GEMINI_API_KEY)
      throw new Error('GEMINI_API_KEY is required for the gemini provider.');
    return {
      completion: geminiCompletion(env.GEMINI_API_KEY),
      billing: 'metered',
      label: `gemini:${MODEL}`,
    };
  }
  if (provider === 'openai-compatible') {
    const baseUrl = env.EVENTSIGNAL_LLM_BASE_URL;
    const model = env.EVENTSIGNAL_LLM_MODEL;
    if (!baseUrl)
      throw new Error(
        'EVENTSIGNAL_LLM_BASE_URL is required for this provider.',
      );
    if (!model)
      throw new Error('EVENTSIGNAL_LLM_MODEL is required for this provider.');
    const host = new URL(baseUrl).hostname;
    const loopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(host);
    return {
      completion: openAiCompatibleCompletion({
        baseUrl,
        model,
        apiKey: env.EVENTSIGNAL_LLM_API_KEY,
      }),
      billing: loopback ? 'free' : 'metered',
      label: `openai-compatible:${model}`,
    };
  }
  throw new Error(`Unknown EVENTSIGNAL_PROVIDER: ${provider}`);
}
