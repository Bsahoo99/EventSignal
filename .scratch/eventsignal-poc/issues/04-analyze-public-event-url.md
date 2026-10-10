# 04: Analyze a public event URL with a pasted-text fallback

**What to build:** The owner supplies a supported public event URL and reaches the same exploratory brief as the pasted-text flow. If the page is blocked, unreadable, or unsupported, the interface explains the limitation and lets the owner continue by pasting public text.

**Blocked by:** 02 — Run a private, budget-limited analysis from pasted event text.

**Status:** implementation present — see docs/EVALUATION.md for verification limits and pending live validation

**Source:** EventSignal PRD; user stories 7–13, 25–28.

## Acceptance criteria

- [ ] At least one representative public event page is retrieved and analyzed end to end with no login, session cookies, hidden endpoints, or attendee-list scraping.
- [x] Retrieved event evidence records the source URL, retrieval time, named people/companies, and explicit event relationships. Event date and attendance modality are retained only when supported.
- [x] Public retrieval is distinguished from pasted text. Supplying a URL alongside pasted text does not make that text independently verified.
- [x] Explicit hosts, speakers, and presenting-company relationships can become recommendations. Historical attendee lists are not treated as current participants, remote speakers are not presented as in-person targets, and sponsors do not imply named representatives.
- [x] Person/company identity ambiguity stays visible or excludes the target; URL retrieval cannot bypass the uncertainty policy established in ticket 02.
- [x] URL validation and every redirect prevent fetching local/private-network destinations. Fetches enforce bounded response size, redirects, timeouts, and supported content types before research uses the material.
- [x] Retrieval failures produce an actionable state with a pasted-text alternative. The owner can complete analysis through that alternative without losing the current profile.
- [x] Retrieval progress and source status reflect what actually happened. Access failures are not misreported as evidence that no relevant people exist.
- [x] Workflow tests cover supported retrieval, blocked/unsupported pages, fallback completion, sparse pages, historical/remote entries, ambiguous identity, oversized input, and unsafe destinations/redirects.
- [x] A browser check submits a URL, inspects a result's source, then exercises the fallback after a controlled retrieval failure.

## Scope notes

Reuse the established analysis and budget paths. This slice establishes safe public retrieval for event content and later company/job sources. Do not build a broad crawler, authenticated integrations, browser automation for every provider, or universal event-platform support.

**Demo:** Analyze a supported event page, then show a blocked page recovering through pasted text into the same result interface.

**Implementation note:** Authorized as part of the full six-ticket scope. Checked criteria are supported by fixture-based tests, browser checks, builds, or manual source review. Unchecked criteria contain provider-dependent validation explicitly deferred by the user. See `docs/TICKETS.md` and `docs/EVALUATION.md` for the limits.
