# 03: Edit the career profile and rerun matching

**What to build:** The owner reviews and corrects the prefilled career profile, changes role preferences or evidence, and reruns the same event to receive a brief reflecting the submitted profile rather than a fixed persona.

**Blocked by:** 02 — Run a private, budget-limited analysis from pasted event text.

**Status:** implementation present — see docs/EVALUATION.md for verification limits and pending live validation

**Source:** EventSignal PRD; user stories 1–6, 21–24, and 27.

## Acceptance criteria

- [ ] The owner can review and edit target roles, skills, experience summaries, selected project/work evidence, and job preferences before submitting an analysis.
- [ ] The initial role priorities are Applied AI Engineer, then Forward-Deployed and Full Stack AI Engineer. Professional claims remain attributed to user-provided material.
- [ ] Bay Area and remote work are initial preferences rather than mandatory restrictions. Unprovided relocation, employment type, company stage, and authorization/sponsorship requirements remain unknown.
- [ ] The editor distinguishes a preference from an explicitly entered hard constraint. It never infers eligibility or seniority from identity, education, or employment history.
- [ ] Profile validation explains missing or invalid inputs without inventing replacement experience. The owner can correct and resubmit without a separate administration workflow.
- [ ] The submitted profile reaches the existing analysis boundary and determines matching and conversation preparation. Changes cannot be silently ignored in favor of the saved demo persona.
- [ ] When target roles, skills, or supporting experience change, a relevant fixture produces a corresponding change in fit explanation, selected experience, or ordering. Unsupported achievements remain absent from introductions.
- [ ] Reruns retain evidence attribution and use the same private-access and budget controls as the initial analysis.
- [ ] A workflow test compares outputs from two materially different profiles against the same controlled event evidence. A browser check edits the profile, submits, and inspects the updated brief.
- [ ] Editor labels, validation messages, and primary controls are usable on mobile and by keyboard.

## Scope notes

General-purpose resume upload/parsing, external profile synchronization, LinkedIn extraction, accounts, and advanced profile persistence are excluded. Selecting profile storage is an implementation detail; editing must not expose private fields to the public example.

**Demo:** Change the owner's target emphasis from applied AI to backend-oriented work, rerun the same event, and show the evidence-supported differences in the brief.

**Implementation note:** Authorized as part of the full six-ticket scope. Acceptance checkboxes remain the original review checklist; use `docs/TICKETS.md` and `docs/EVALUATION.md` for the verified status, including incomplete provider-dependent gates.
