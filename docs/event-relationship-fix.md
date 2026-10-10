# Event relationship regression — October 10, 2026

The owner reported repeated insufficient-evidence results. The first supplied event lists hiring partners and their roles; the current event, Heavyweights, explicitly describes Ankur Goyal and Corinne Riley discussing evals and agent observability. Both are usable public event evidence.

## Required behavior

- Recognize named fireside/discussion participants as speakers when their exact source quote supports their identity, company, and discussion relationship. Preserve existing exclusions for ambiguous and historical identities.
- Match the narrow terminology equivalents `eval`/`evals`/`evaluation`/`evaluations` and `agent`/`agents`, respecting word boundaries. Explain fit using both original event topics and submitted skill names.
- Recognize explicitly listed hiring partners, even where the event gives a role title but no matching skill keywords. Label these exploratory leads with fit not established; do not invent skill overlap or eligibility.
- Show an event-listed role only when the quoted company entry supports that company's title. A role mentioned elsewhere in a multi-company quote must not be attributed to the wrong company.
- Ignore invisible zero-width formatting and whitespace differences during quote comparison; continue to reject invented or paraphrased source content.
- Keep event participation and listed roles distinct from independently verified official openings. Preserve the existing official-source verification and budget rules.
- Return source evidence, profile-specific conversation preparation, and uncertainty. Keep the existing maximum of five recommendations.

The regression tests use the already approved application-level `analyze` seam (PRD Testing Decisions). Controlled extraction/page responses incur no paid usage. Live checks use the configured owner ledger and existing $8 ceiling.

Review baseline: `078902f8416ead75f774995e5c04bad1d4ad7e2a`, the clean commit immediately preceding this user-reported fix.

## Validation

- 34 automated workflow/invariant checks passed; TypeScript, public production build, formatting, and whitespace checks passed.
- Heavyweights was submitted through the actual owner UI with Gemini. The final result shows Baseten, Ankur Goyal, and Corinne Riley, all exploratory, with supported agents/evals relevance. The page lacks unambiguous official company links, so job research remains incomplete. The final displayed request cost was $0.0009 (rounded by the UI).
- A captured real Gemini response for the Talent Hunt exposed invisible zero-width characters in the source that the model omitted from its quotes. A subsequent live run returned all five hiring partners with their event-listed role titles ($0.001573 recorded). The final attribution refinement preserves HTML paragraph/list boundaries and was verified using the freshly fetched page and captured provider response; all five titles remain supported. This replay used a temporary test ledger and made no further paid call. It is not a claim of live job verification.
- Role attribution uses the start of a complete paragraph/list entry rather than a company-name substring. Where pasted text lacks clear entry boundaries, the role is omitted conservatively while the exploratory relationship remains. Hiring-partner skill evidence is limited to that company's validated role.
- The named roles remain event claims. No independently verified opening, eligibility, attendance, or referral willingness was established by these checks.
