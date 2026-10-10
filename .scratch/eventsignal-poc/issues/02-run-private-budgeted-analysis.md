# 02: Run a private, budget-limited analysis from pasted event text

**What to build:** The owner pastes public event text and receives a short exploratory networking brief grounded in that text and the prefilled career profile. This is the first complete live-analysis slice, including private access, model integration, evidence attribution, and budget enforcement before the first paid call.

**Blocked by:** 01 — Explore a saved, evidence-backed opportunity brief.

**Status:** implementation present — see docs/EVALUATION.md for verification limits and pending live validation

**Source:** EventSignal PRD; user stories 8–13, 18–26, 28–29, and 34.

## Acceptance criteria

- [ ] Owner mode accepts pasted public event text and uses the initial profile derived from Biswajeet's supplied professional material. The public example remains available without enabling live research.
- [ ] The request passes through one application-level analysis boundary and returns the result contract used by the saved-brief interface.
- [ ] Credentials remain server-side and outside version control. Missing credentials produce a useful setup state and no provider request. Public mode rejects direct requests for live analysis.
- [ ] Model availability, structured-output compatibility, current pricing, and any search allowance assumptions are checked before paid integration validation. Gemini 3.1 Flash-Lite is the provisional single-provider default; access failures are reported without a silent provider substitution.
- [ ] Before every paid operation, the application reserves a conservative maximum cost against a persistent local ledger. Combined reservations cannot exceed the $8 development stop threshold, including under concurrent requests or after restarting the application.
- [ ] Input size, model output, retries, source processing, and request duration are bounded. Usage is reconciled conservatively after each request; unknown outcomes are not assumed free. Missing or corrupt budget accounting prevents new paid work.
- [ ] Model/search charges are included where used. Unbounded paid operations stay disabled. The UI explains that the limit covers this application's usage, with $2 reserved separately for final validation, rather than claiming to cap unrelated account spending.
- [ ] Public event relationships come only from explicit supporting text. Pasted content is labeled user-supplied even if the owner attaches a URL; it is not represented as independently retrieved evidence.
- [ ] Historical attendee lists, remote participation, and ambiguous person/company identities do not become confident in-person approach recommendations. Uncertain targets are excluded or clearly flagged.
- [ ] The result contains zero to five exploratory recommendations, each with a supported event relationship, reproducible fit explanation, relevant supplied experience, short introduction, and three questions. This slice does not claim to have researched or verified current jobs.
- [ ] Factual claims refer back to supporting event/profile evidence. Unsupported candidate achievements, company facts, hiring intent, attendance, and referral promises are omitted or rejected.
- [ ] Source text is treated as data rather than instructions. Embedded requests cannot change research policy, reveal secrets, or authorize additional actions.
- [ ] No named targets or no credible fit produces an insufficient-evidence result. Provider timeout, malformed output, or exhausted budget produces a distinct partial/failure state with a next step, never filler recommendations.
- [ ] Progress reflects actual processing stages rather than simulated completion. Spending limitations are understandable in the owner interface.
- [ ] Workflow tests exercise pasted-text success, sparse evidence, ambiguous/historical/remote relationships, unsupported generated claims, hostile source instructions, missing credentials, provider failures, and budget exhaustion using controlled external responses.
- [ ] Budget tests demonstrate persistent accounting and concurrent reservations. Normal tests make no billable calls; a bounded owner-mode validation confirms the actual provider path and records its cost.

## Scope notes

Use local owner mode as the default private execution arrangement. Do not add a user-account system. Keep the initial career profile prefilled; editing and reruns are ticket 03. Public URL retrieval is ticket 04, and official job research is ticket 05. The cost ledger is part of this usable slice, not a later hardening task.

**Demo:** Paste a short public event description, receive an exploratory brief, inspect its attribution, then demonstrate that insufficient budget prevents another paid analysis.

**Implementation note:** Authorized as part of the full six-ticket scope. Acceptance checkboxes remain the original review checklist; use `docs/TICKETS.md` and `docs/EVALUATION.md` for the verified status, including incomplete provider-dependent gates.
