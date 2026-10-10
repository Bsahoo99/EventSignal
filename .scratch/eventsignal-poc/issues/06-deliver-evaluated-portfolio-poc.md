# 06: Deliver an evaluated public example and repeatable owner workflow

**What to build:** A visitor can explore an evidence-reviewed public example, and the owner can reproduce the complete private workflow using documented setup and known limitations. Finish the release through real-source evaluation and visible quality improvements rather than adding features.

**Blocked by:**
- 03 — Edit the career profile and rerun matching.
- 05 — Research official openings and rank supported opportunities.

**Status:** implementation present — see docs/EVALUATION.md for verification limits and pending live validation

**Source:** EventSignal PRD; all acceptance gates, especially user stories 28–34 and the agreed real-source evaluation.

## Acceptance criteria

- [ ] A small documented evaluation includes a useful public named-speaker event, a sparse event, and a page with retrieval limitations. Record source URLs, check dates, expected evidence, returned claims/recommendations, limitations, and observed application cost.
- [ ] Review the evaluated briefs against retrieved evidence. Unsupported factual claims are corrected or omitted, and known unresolved limitations remain visible rather than being described as validated quality.
- [ ] The public example uses reviewed evidence and the owner's selected professional profile. Past events and historical job evidence are explicitly labeled; no old snapshot is presented as a current check.
- [ ] The full owner flow works from profile editing through URL or pasted input to recommendations, evidence inspection, and conversation preparation, including partial and insufficient-evidence outcomes.
- [ ] Browser checks cover the public example, profile edits, recommendation expansion, evidence links, and representative loading, empty, partial, missing-credential, budget, and failure states.
- [ ] Primary screens remain readable on a narrow mobile viewport; keyboard navigation, focus, labels, and state messaging are verified and material failures fixed.
- [ ] The application passes its workflow tests and production build. Normal verification remains repeatable without live research or billable calls.
- [ ] Real-provider checks remain within the agreed total budget. If the $2 validation reserve is needed after the $8 development stop, use an explicit documented validation allowance that cannot bring total recorded spending above $10; never silently raise or reset the development ledger.
- [ ] Public build/release configuration rejects live-analysis requests at the server boundary and excludes secrets, raw resumes, contact fields, local usage records, and private inputs from public outputs.
- [ ] Document local owner setup, server-side credential configuration, selected model, supported event inputs, live-call limits, budget behavior, public-example build/run steps, and known research limitations.
- [ ] Provide a deployable public-demo build. If no hosting destination is configured, record that deployment remains pending rather than creating an external account or claiming the site is published.
- [ ] Record the final evaluation and verification results, including any incomplete acceptance gates. Do not add accounts, CRM, MCP, scraping, or automated outreach to resolve release friction.

## Scope notes

Earlier tickets include tests for their own behavior; this ticket is not a deferred testing phase. It completes the demonstrable product, curates its public example, and records real-source evidence. External deployment is separate from a verified deployable build and requires a chosen destination.

**Demo:** A visitor explores the saved example, then the owner edits the profile and runs a supported event privately while explaining evidence, uncertainty, and measured spending.

**Implementation note:** Authorized as part of the full six-ticket scope. Acceptance checkboxes remain the original review checklist; use `docs/TICKETS.md` and `docs/EVALUATION.md` for the verified status, including incomplete provider-dependent gates.
