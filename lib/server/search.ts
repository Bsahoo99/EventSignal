import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import type { SearchHit, Searcher } from './discovery';
const hitsSchema = z
  .array(
    z.object({
      title: z.string().max(500),
      url: z.url().max(2000),
      description: z.string().max(2000),
    }),
  )
  .max(5);

export function tavilySearch(key: string): Searcher {
  return async (query) => {
    if (!key || query.length > 400)
      throw new Error('Search configuration or query invalid');
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        auto_parameters: false,
        max_results: 5,
        topic: 'general',
        include_answer: false,
        include_raw_content: false,
        include_images: false,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok)
      throw new Error('Search provider unavailable; check key and quota.');
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Empty search response');
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        if (bytes > 200_000) throw new Error('Search response exceeds limit');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const schema = z.object({
      results: z
        .array(
          z.object({
            title: z.string(),
            url: z.url(),
            content: z.string().optional(),
          }),
        )
        .max(20),
    });
    const result = schema.parse(JSON.parse(Buffer.concat(chunks).toString()));
    return hitsSchema.parse(
      result.results.slice(0, 5).map((hit) => ({
        title: hit.title.slice(0, 500),
        url: hit.url,
        description: (hit.content ?? '').slice(0, 2000),
      })),
    );
  };
}

/** Only public search results, never profiles, credentials, or verified job state. */
export class SearchCache {
  constructor(private path: string) {}
  private open() {
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    const db = new DatabaseSync(this.path);
    try {
      chmodSync(this.path, 0o600);
      db.exec(
        'PRAGMA busy_timeout=1000; CREATE TABLE IF NOT EXISTS results (query TEXT PRIMARY KEY, payload TEXT NOT NULL, expires INTEGER NOT NULL)',
      );
      return db;
    } catch (error) {
      db.close();
      throw error;
    }
  }
  get(query: string, now: number): SearchHit[] | undefined {
    try {
      const db = this.open();
      try {
        const row = db
          .prepare('SELECT payload FROM results WHERE query=? AND expires>?')
          .get(query, now);
        return row
          ? hitsSchema.parse(JSON.parse(String(row.payload)))
          : undefined;
      } finally {
        db.close();
      }
    } catch {
      return undefined;
    }
  }
  put(query: string, hits: SearchHit[], now: number) {
    try {
      const data = hitsSchema.parse(hits);
      const db = this.open();
      try {
        db.prepare('INSERT OR REPLACE INTO results VALUES (?,?,?)').run(
          query,
          JSON.stringify(data),
          now + 24 * 60 * 60 * 1000,
        );
        db.prepare('DELETE FROM results WHERE expires<=?').run(now);
        db.exec(
          'DELETE FROM results WHERE query NOT IN (SELECT query FROM results ORDER BY expires DESC LIMIT 200)',
        );
      } finally {
        db.close();
      }
    } catch {
      /* A cache failure must not turn successful research into a failure. */
    }
  }
}
