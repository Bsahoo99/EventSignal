# Implementation review

Baseline: `39019f2` (planning documents). Initial implementation reviewed: `51799e0`. Both axes ran independently under the requested code-review workflow. Each reviewer then rechecked its fixes in the working tree.

## Standards

1. **Documented contract violation: missing usage became zero usage.** The provider adapter substituted zero for an absent output-token count, permitting reconciliation below the conservative reservation. This violated the README/PRD spending contract. **Fixed:** reconciliation requires complete valid prompt/total/candidate counts and uses total minus prompt, including thinking. A provider-adapter regression through the application boundary retains the full $0.10 for incomplete metadata; a complete-usage test confirms reconciliation.
2. **Possible Primitive Obsession (judgment call): display wording controlled research.** The official-company path compared `relationship` with the visible string “Listed presenting company.” **Fixed:** recommendations retain a typed `relationshipKind`; research uses that field independently of display text.

Reviewer recheck: both resolved; zero unresolved findings. Original worst Standards issue was incomplete usage releasing the reserved budget.

## Spec

1. **P1: filled positions could be labeled verified.** Ticket 05 requires explicitly closed/expired roles to be excluded. The phrase “this position has been filled” was not recognized. **Fixed:** closure handling covers that phrase and “applications are now closed”; both have application-boundary regression tests.
2. **P2: an unrelated closed vacancy suppressed a matching open role.** Closure matching applied to the whole source page. **Fixed:** closure evidence is associated with the role's title-bearing clause or its immediately following status clause. An unrelated Product Designer closure no longer invalidates an open Applied AI Engineer listing. The existing contradictory-detail regression still passes.

Reviewer recheck: both resolved; zero unresolved findings. Original worst Spec issue was incorrectly verifying an explicitly filled role. No scope-creep findings.

Paid-provider and real-source model-quality checks remain explicitly deferred by the user; their status is recorded in EVALUATION.md.

**Review totals: Standards 2 found / 2 fixed; Spec 2 found / 2 fixed. No unresolved findings on either axis.**
