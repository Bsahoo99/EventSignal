# Evaluation — October 9, 2026 (America/Los_Angeles)

## What is established

The public historical example was reviewed against the [2025 World’s Fair page](https://ai.engineer/worldsfair/2025) and [official Harrison Chase talk archive](https://ai.engineer/talks/kTnfJszFxCg-3-ingredients-building-reliable-enterprise-agents). The first supports the event date/place; the second supports the recorded speaker/talk relationship. It does not establish current attendance, availability, hiring, or referral willingness. The example has one exploratory connection, no job-verification claim, and selected user-provided professional experience. Suggested wording is an interpretation.

The application's actual safe fetcher is exercised by `npm run evaluate`; machine-readable results and UTC retrieval times are in [source-checks.json](evaluation/source-checks.json). The local date of these checks is October 9, 2026. No model calls occur in that command.

| Case | Expected evidence | Observed behavior | Recommendation/quality status |
| --- | --- | --- | --- |
| LangChain Interrupt conference announcement | Historical conference program, public names, and agent topics | Readable via public redirect to LangChain's blog; bounded source text returned | Provider not run; no live brief claimed |
| PyCon Greece 2026 listing on Python.org | Event date/location with sparse participant evidence | See recorded read outcome | Expected insufficient evidence; provider not run |
| Luma SF event listing | Retrieval may require more than bounded server-side HTML | Read rejected above the 250 KB limit | Pasted-text fallback required; no inferred absence of participants |

The saved example is manually curated. It is not presented as an automatically generated result from a provider run.

## Repeatable verification

Application-level tests cover pasted and fetched attribution; changed profile/roles; ambiguous/historical/remote entities; duplicate suppression; sparse results; validation; unsupported generated fields; credential/provider/ledger failures; URL fallback; official job evidence, ATS association, closed/expired/contradictory roles, and partial evidence. Independent processes race for the last budget reservation. Source tests reject private/special addresses and unsafe redirects. Normal tests spend $0.

The browser suite checks desktop/mobile public briefs, disclosures and evidence links, rejection of public API requests, owner credential setup, edited profile submission, loading, and pasted recovery. UI success paths use the same coordinator with external fixtures. Build-time and runtime owner switches are both required. The production build disables live entry points.

## Incomplete gates and limitations (updated October 10, 2026)

- **Provider access and integration: confirmed October 10, 2026.** After the user configured the key locally, the official model endpoint confirmed account access. One synthetic event was submitted through the real owner HTTP API. Structured output was accepted, one exploratory recommendation returned, and the durable ledger reconciled the request to an estimated $0.00025. See [provider-smoke.json](evaluation/provider-smoke.json). This establishes integration, not real-event matching quality.
- **Real-source end-to-end quality: limited checks completed October 10.** The Heavyweights event was analyzed through the owner UI with Gemini and now returns Baseten, Ankur Goyal, and Corinne Riley as exploratory connections. A captured real-provider response for the Talent Hunt was replayed through the repaired coordinator and returns five hiring partners with event-listed roles. These checks exposed and repaired narrow relationship keywords, terminology mismatches, and invisible-formatting rejection. They do not establish general model quality or real job-verification quality. See [event-relationship-fix.md](event-relationship-fix.md).
- Discovery is bounded to event links, owner-supplied sites, or up to five Brave searches with identity checks. Automatic job verification supports readable JSON-LD plus visible title, not arbitrary career-page formats. Company aliases, complex identity relationships, semantic contradictions, and eligibility decisions need manual source review.
- The initial profile contains only the selected summary in the PRD. Original resume/project records were unavailable in this workspace; enter exact project evidence in the editor before relying on personalized introductions.
- The $2 validation reserve is not enabled. The development ceiling stays $8. No total account-spend guarantee is made.
- Hosting is unconfigured. A production build is available; the site has not been published.

The initial live synthetic-input run recorded **$0.00025**. Subsequent user event submissions and bounded diagnostics are recorded in the private owner ledger; the initial amount is not the cumulative total. Gemini grounding remains disabled; optional bounded Brave discovery is implemented, with live Brave validation pending its key. Offline fixture tests and captured-response replay use temporary test ledgers. These estimates are not a provider billing statement.

## Final verification record

- Full automated workflow/invariant suite: **28 passed**; no paid calls.
- TypeScript check: passed.
- Public production build: passed with Next.js 16.4.0.
- Browser checks: **7 passed** (six-suite run plus final evidence-navigation check): desktop/mobile public example, private credential setup, edited-profile output, URL fallback, empty/budget/provider states, and distinct opening labels/evidence navigation.
- Public production access smoke test: `/api/analyze` returned **403** and `/owner` returned **404** even with owner mode and a valid-length owner token supplied at runtime.
- Desktop (1280 px) and mobile (390 px) screenshots were inspected; no horizontal overflow or obscured primary controls was observed. Keyboard disclosure activation is covered in browser checks.
- Separate Standards and Spec reviews each found two issues; all four were fixed and independently rechecked. See REVIEW.md.


## Company discovery validation — October 10, 2026

- Added missing-link discovery, manual company website input, per-company research statuses, persistent 24-hour search caching, and search charges in the existing $8 ledger.
- Application regressions cover verified official pages versus snippets, name/domain/context ambiguity (including unrelated subdomains and “reagents”), manual fallback, missing/failed search, cache freshness/expiry, and budget/research limits. Fixture runs incur no real provider charges.
- Live safe-reader checks initially rejected Cresta and Braintrust above 250 KB. Both now return readable source text with the bounded 1 MB HTML allowance; the 20,000-character extraction cap and address/redirect/time protections remain. See [company-source-checks.json](evaluation/company-source-checks.json). These source checks made no model/search calls and do not establish verified job openings.
- Live Brave search remains pending: BRAVE_SEARCH_API_KEY was absent at the final configuration check. The user agreed to add it. Controlled provider-adapter tests are not a live search validation.
- New UI browser inspection was blocked by browser URL policy. Earlier browser-suite results above apply to the earlier implementation, not this new field/status display. No alternate browser surface was used to bypass the block.

Final discovery verification: **44 automated tests passed**, TypeScript passed, public production build passed, formatting and diff checks passed. Independent Standards and Spec rechecks each reported zero unresolved findings.
