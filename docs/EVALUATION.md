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

## Incomplete gates and limitations

- **Paid provider access and quality: pending by explicit user instruction.** No key was configured or requested in chat. Account access, actual structured-output acceptance, provider usage reconciliation, measured real-call cost, and real generated briefs still require a bounded owner run. Provider docs were checked; documentation is not account validation.
- **Real-source end-to-end quality: pending.** Public retrieval was exercised and sample facts reviewed, but no model-generated real-page brief or real job research result was validated. Do not advertise an evaluated model or verified live matching quality.
- Discovery is intentionally narrower than a search engine: linked company domains only. Automatic job verification supports readable JSON-LD plus visible title, not arbitrary career-page formats. Company aliases, complex identity relationships, semantic contradictions, and eligibility decisions need manual source review.
- The initial profile contains only the selected summary in the PRD. Original resume/project records were unavailable in this workspace; enter exact project evidence in the editor before relying on personalized introductions.
- The $2 validation reserve is not enabled. The development ceiling stays $8. No total account-spend guarantee is made.
- Hosting is unconfigured. A production build is available; the site has not been published.

Observed application model/search cost for this work: **$0**. Synthetic usage in tests is recorded only in temporary test ledgers, never the owner's ledger.

## Final verification record

- Full automated workflow/invariant suite: **28 passed**; no paid calls.
- TypeScript check: passed.
- Public production build: passed with Next.js 16.4.0.
- Browser checks: **7 passed** (six-suite run plus final evidence-navigation check): desktop/mobile public example, private credential setup, edited-profile output, URL fallback, empty/budget/provider states, and distinct opening labels/evidence navigation.
- Public production access smoke test: `/api/analyze` returned **403** and `/owner` returned **404** even with owner mode and a valid-length owner token supplied at runtime.
- Desktop (1280 px) and mobile (390 px) screenshots were inspected; no horizontal overflow or obscured primary controls was observed. Keyboard disclosure activation is covered in browser checks.
- Separate Standards and Spec reviews each found two issues; all four were fixed and independently rechecked. See REVIEW.md.
