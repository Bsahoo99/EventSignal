import { analyze } from '@/lib/server/analysis';
import { Budget } from '@/lib/server/budget';
import { geminiExtractor } from '@/lib/server/model';
import { authorize, ownerEnabled } from '@/lib/server/access';
import { braveSearch, SearchCache } from '@/lib/server/search';
export const runtime = 'nodejs';
export async function POST(request: Request) {
  if (!ownerEnabled())
    return Response.json(
      { message: 'Live analysis is disabled in this public build.' },
      { status: 403 },
    );
  if (!authorize(request))
    return Response.json(
      {
        message: 'Use the local owner server and its configured access token.',
      },
      { status: 401 },
    );
  let raw: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new Error();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 64_000) throw new Error();
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    raw = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return Response.json(
      { message: 'Request must be JSON smaller than 64 KB.' },
      { status: 400 },
    );
  }
  const key = process.env.GEMINI_API_KEY ?? '';
  let disconnected = false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) => {
        if (!disconnected)
          controller.enqueue(encoder.encode(JSON.stringify(value) + '\n'));
      };
      try {
        const result = await analyze(raw, {
          mode: 'owner',
          credentials: !!key,
          extract: geminiExtractor(key),
          search: process.env.BRAVE_SEARCH_API_KEY
            ? braveSearch(process.env.BRAVE_SEARCH_API_KEY)
            : undefined,
          searchCache: new SearchCache(
            process.env.EVENTSIGNAL_SEARCH_CACHE ??
              '.local/search-cache.sqlite',
          ),
          budget: new Budget(
            process.env.EVENTSIGNAL_LEDGER ?? '.local/budget.sqlite',
          ),
          now: () => new Date().toISOString(),
          onStage: (stage) => send({ stage }),
        });
        send({ result });
      } catch {
        send({
          result: {
            ok: false,
            code: 'provider',
            message:
              'Analysis stopped unexpectedly. Check the local server and ledger before retrying.',
            stages: [],
          },
        });
      } finally {
        if (!disconnected) controller.close();
      }
    },
    cancel() {
      disconnected = true;
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson',
      'cache-control': 'no-store',
    },
  });
}
