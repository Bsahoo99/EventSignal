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

At this initial review, paid-provider and real-source model-quality checks were deferred by the user. Subsequent validation is recorded in EVALUATION.md.

**Review totals: Standards 2 found / 2 fixed; Spec 2 found / 2 fixed. No unresolved findings on either axis.**

# Event relationship fix review — October 10, 2026

Baseline: `078902f`; first fix commit: `b4f56f3`. Spec: [event-relationship-fix.md](event-relationship-fix.md). Both axes independently reviewed the committed diff and rechecked the final working-tree corrections.

## Standards

One evidence-attribution violation: a company name could match the suffix of another company name and inherit its role. A word-boundary correction did not address spaced names such as Super Acme. **Fixed:** retain HTML paragraph/list entries and anchor the complete company name at the entry start; ambiguous flattened text leaves the role unknown. Reviewer recheck: zero unresolved findings. No actionable baseline smells.

## Spec

Two evidence-attribution findings: company-name suffixes could supply the wrong role, and multi-company quotes could supply another company's skill topics. **Fixed:** validate roles against complete source entries, and restrict hiring-partner skill evidence to the validated role. Original reproductions and the spaced-name variant no longer create false role or skill claims. Reviewer recheck: zero unresolved findings. No scope-creep findings.

**Fix review totals: Standards 1 found / 1 fixed; Spec 2 found / 2 fixed. Zero unresolved findings on either axis.** Final validation: 34 automated tests, TypeScript, public build, and formatting checks; live owner UI and bounded source/provider checks documented in the fix record.


# Company discovery review — October 10, 2026

Baseline: `8ada36d`; first implementation: `f6fa9a9`. Spec: [company-discovery.md](company-discovery.md). Both axes reviewed independently and rechecked corrections.

## Standards

1. An unrelated subdomain could satisfy the company brand check and promote an opening. **Fixed:** public-suffix-aware registrable-domain matching; private hosting suffixes are excluded from automatic discovery. A controlled application regression rejects both unrelated subdomains and private hosting while accepting a matching .co.uk domain.
2. A career-read research limit appeared as an unreadable page. **Fixed:** preserve the limit category and report the traversal cap explicitly. Confirmed with an application regression.

Reviewer recheck: zero unresolved findings; no actionable baseline smells. Original worst issue: unrelated subdomains being accepted as official company domains.

## Spec

1. Substring context matching accepted “reagents” as event evidence for “agents.” **Fixed:** normalize both sides and compare complete words. Regression confirms the unrelated company stays unverified.
2. Careers-stage limits were misreported as unreadable sources. **Fixed:** preserve research-limited status; existing verified openings retain partial-research warnings.

Reviewer recheck: zero unresolved findings; no scope-creep findings. Original worst issue: false event-context corroboration promoting the wrong company.

**Discovery review totals: Standards 2 found / 2 fixed; Spec 2 found / 2 fixed. Zero unresolved findings on either axis.**

Both reviewers additionally cleared the bounded HTML allowance change after the live source checks. Final checks: 44 automated tests, TypeScript, public production build, formatting, and diff checks passed.

# Tavily migration review — October 10, 2026

Baseline: `f9732fd`; implementation: `2c1f6c0`. Spec: [tavily-search.md](tavily-search.md). Independent reviewers inspected the committed change, then rechecked the documentation correction.

## Standards

One documentation finding: README's cache/budget bullet retained the old $0.005 rate. **Fixed:** it now consistently states $0.008 per completed Basic search. No implementation violations or actionable baseline smells found. Recheck: zero unresolved findings.

## Spec

One documentation finding: the same old price contradicted the requested Tavily accounting and owner guidance. **Fixed:** $0.008 is consistent across code, spec, and README. No runtime or scope-creep findings. Recheck: zero unresolved findings.

**Migration totals: Standards 1 found / 1 fixed; Spec 1 found / 1 fixed. Zero unresolved findings on either axis.** Validation: 44 automated tests, TypeScript, public build, formatting, and diff checks passed. Live Tavily validation awaits the user's key; fixture tests made no paid requests.
