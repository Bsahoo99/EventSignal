# EventSignal

A personal event-preparation POC: a saved public brief and a private, local analysis workflow in one Next.js/TypeScript app.

## Run the saved example

Use Node.js 22.13+ (tested with Node 26) and npm:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The historical example needs no credentials and makes no research calls. Recommendations expand with native, keyboard-accessible disclosure controls. The public example uses only selected professional background, never a raw resume or contact fields.

## Private local analysis

```sh
cp .env.example .env.local
openssl rand -hex 32
```

Put the generated value in `EVENTSIGNAL_OWNER_TOKEN` and your Gemini credential in `GEMINI_API_KEY` in `.env.local`. Never paste credentials into chat or commit them. The UI asks for the owner token; it remains in page memory and is sent only to the local API.

For automatic company website discovery, also set `BRAVE_SEARCH_API_KEY`. Without it, event-linked websites still work, and the owner can enter `Company name | https://official-website.com` under **Company websites** (up to five entries). A supplied URL must pass public-reader and company identity checks; it does not verify an opening by itself.

```sh
npm run budget:init
npm run dev:owner
```

Open http://127.0.0.1:3000/owner. Enter your token, edit the profile, then paste public event text or provide a public HTTPS URL. Separate roles, skills, and experience entries with newlines. Profile edits remain in page memory, including across reruns and retrieval failures; reloading the page resets them. Preferences are contextual notes, not eligibility filters. Unverified hard constraints keep an otherwise supported role exploratory.

The server binds to loopback. Owner requests also need the configured token, a local Host, and a matching browser Origin. This is a local-owner arrangement, not an account system for internet deployment. Public builds reject analysis before input parsing or network activity, even if owner mode is set at runtime.

## Budget and provider

The adapter uses `gemini-3.1-flash-lite`, one structured extraction per analysis, no retries, no model tools, and no Gemini search grounding. Bounded Brave Web Search independently discovers candidate company URLs. Limited real-event checks and their remaining quality gaps are recorded in docs/EVALUATION.md.

The [provider model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) lists structured output support. [Gemini pricing checked October 10, 2026](https://ai.google.dev/gemini-api/docs/pricing): standard text input $0.25/million tokens, output including thinking $1.50/million. [Brave Web Search pricing](https://api-dashboard.search.brave.com/documentation/pricing), checked the same day: $5/1,000 requests. The app counts $0.005 per completed search without assuming free credits. Gemini grounding remains disabled. Recheck tariffs when enabling credentials in the future.

SQLite reserves $0.10 before each model or search call against an $8 development ceiling. The request body is at most 100 KB (conservatively below 100,000 input tokens); output is capped at 4,096 tokens. At recorded tariffs this fits within the reservation. Integer microdollars avoid floating-point accounting. Atomic transactions prevent concurrent processes overspending. Measured input/output usage reconciles the reservation; missing usage or unknown outcomes retain the full reservation. A crash leaves its reservation counted. Missing/corrupt ledgers fail closed.

`npm run budget:init` refuses to reset an existing file. Keep `.local/budget.sqlite` on a persistent local filesystem, backed up with owner-controlled permissions. Changing/deleting the ledger can defeat accounting; this application cannot cap unrelated provider-account spending. Do not run owner mode on ephemeral/serverless storage. The remaining $2 is not accessible to this implementation: a separately approved validation procedure is needed before using it. The app never silently raises the ceiling.

## Research boundaries

- Input: 20–20,000 characters, at most ten extracted targets and five returned recommendations.
- Public reading: HTTPS only, no credentials/nonstandard ports; all resolved IPs must be public. The chosen IP is pinned to the TLS request. Redirects receive the same checks. No cookies, hidden APIs, or login automation.
- Each page: 250 KB, at most three redirects, 15-second overall deadline and 10-second request timeout, HTML/plain text only. At most twenty unique company/job page reads after the event page, with a 110-second research deadline and four career traversal pages per company. Search requests have an eight-second deadline; all research remains bounded. JavaScript-only pages may require pasted text.
- Exact source excerpts support names, affiliations, relationship cues and skill topics. Ambiguous and historical attendee entries are excluded. Remote participation remains visible. These checks are conservative lexical guards, not a formal proof of semantic accuracy; inspect the evidence before approaching anyone.
- Company discovery uses explicit event links or owner-supplied URLs first, then one Brave search per company (maximum five per run). Search candidates need a matching domain brand, a complete company name in the page title/site metadata, and supported event-topic context. At most two candidate homepages are examined; unresolved or unreadable alternatives remain ambiguous. An owner-supplied URL can resolve domain aliases but still needs matching site identity. Search snippets cannot verify jobs.
- Public search results are cached locally for 24 hours (maximum 200 entries). Official pages are re-read each analysis; job availability and private profiles are not cached. Missing/corrupt caches fall back to ordinary search. Search failures retain the $0.10 reservation; completed requests reconcile to $0.005 in the same $8 ledger.
- Job verification requires directly read JobPosting structured data and the visible role title on an established company page, or an Ashby/Greenhouse/Lever page linked by that company. Hiring-organization names must match. Closed/expired or contradictory closed listings cannot verify; unsupported fields stay unknown. Plain unstructured or JavaScript-only job pages remain exploratory.
- Matching uses supported skill overlap, then official target-role matches first. Stable event order breaks ties; there is no opaque model score. Candidate experience and roles shape templated introductions and questions. No model-generated achievements are accepted.
- Company facts, event evidence, candidate claims, and conversation interpretations are separately labeled. An official opening snapshot is not a guarantee of continued availability or eligibility.

## Verification

```sh
npm test
npm run typecheck
npx playwright install chromium  # only if not already installed
npm run test:browser
npm run build
npm run evaluate                # public network reads only; no model calls
```

Workflow tests exercise the public analysis boundary with controlled external responses. Focused checks cover DNS/redirect restrictions and competing-process budget reservations. Browser checks use real public/private entry points for access checks, plus the real coordinator with external fixtures for repeatable owner flows. They make no paid calls.

See [evaluation and remaining gates](docs/EVALUATION.md), [ticket status](docs/TICKETS.md), and [review](docs/REVIEW.md).

## Public production build

```sh
npm run build
npm start
```

`build` explicitly selects public mode. It produces a deployable Node/Next build with live research disabled in compiled server code. Deploy only the public build and required runtime dependencies; exclude `.env.local`, `.local`, test artifacts, and private inputs. No hosting destination is configured; deployment remains pending. Do not change the public build script to owner mode for a public host.
