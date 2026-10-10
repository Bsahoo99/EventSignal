# EventSignal — Event Opportunity Copilot

**Product requirements document · Personal portfolio POC**  
**Date:** October 9, 2026  
**Owner and initial user:** Biswajeet Sahoo  
**Status:** Product scope approved in conversation; this document consolidates that scope. Implementation has not started.  
**Delivery target:** A working prototype within one focused build day, followed by evaluation and polish. This is a timebox and scope constraint, not a delivery guarantee.  
**Development API budget:** $10 total, with an application stop threshold of $8 and $2 reserved for final validation.

## Problem Statement

A technical job seeker preparing for a startup or AI event must connect several separate pieces of information: who is publicly associated with the event, what their companies do, whether those companies publish relevant openings, and which parts of the candidate's background could support a useful conversation.

The immediate user is Biswajeet. His provided resume and public profiles describe roughly four years of professional experience across applied AI and backend engineering. Relevant experience includes retrieval-augmented generation, agents, evaluation, production systems, and customer deployments. The first matching profile will prioritize Applied AI Engineer roles, with Forward-Deployed and Full Stack AI Engineer roles as secondary targets. These priorities are editable defaults; employment claims remain user-provided information.

The product must reduce preparation work without creating false confidence. Being a listed speaker does not prove that someone will attend in person, be approachable, have hiring authority, or offer a referral. A relevant company does not necessarily have an open role. A search snippet does not establish that a job is currently available.

The project's primary purpose is to demonstrate applied AI engineering in a personal portfolio. Its first milestone is a credible, working workflow for the owner—not validation of a commercial business, a comprehensive recruiting system, or an organizer platform.

## Solution

EventSignal turns an editable career profile and a public event URL into a short, evidence-backed networking brief. If the event page cannot be read, the user can paste its public text instead.

The application identifies publicly named speakers, hosts, and presenting companies, researches relevant company context and official job evidence, and returns **zero to five recommendations**. Recommendations distinguish **verified openings** from **exploratory connections**. Every result explains the relationship to the event, the candidate fit, the relevant experience to mention, and what remains uncertain.

Each recommendation includes a short introduction and three informed questions grounded in the candidate's supplied experience and the available source material. The user chooses whom to approach and handles all communication personally.

### Two modes

| Mode | User experience | Research behavior |
|---|---|---|
| Public portfolio example | Visitors explore a clearly labeled, saved example and inspect its evidence and reasoning. | No live model or search calls; no access to private live-analysis controls. |
| Owner's live analysis | Biswajeet edits his profile, supplies an event, runs research, and reviews the resulting brief. | Server-side model and source access, bounded requests, tracked spending, and explicit partial/failure states. |

The simplest implementation default is to run owner-only live analysis locally and deploy the saved example separately with live research disabled. Other private hosting arrangements can be chosen during implementation, provided public visitors cannot trigger paid research.

### Primary workflow

1. Review and edit the prefilled career profile.
2. Enter a public event URL or paste public event text.
3. Start analysis and see truthful progress states.
4. Identify public event relationships and research supported company/job information.
5. Review up to five recommendations, evidence, and uncertainties.
6. Expand a recommendation to read the suggested introduction and three questions.

### Definition of a usable POC

| Requirement | Observable acceptance criterion |
|---|---|
| Editable profile | The owner can change target roles, experience, skills, project evidence, and preferences before analysis; the submitted values affect matching. |
| Event input | At least one supported public event page can be analyzed end to end. Inaccessible or unsupported pages lead to a working pasted-text alternative. |
| Public relationships | Named people or companies are connected to the event using explicit public page evidence or attributed user-pasted text. Historical attendee lists are not treated as this event's participants. |
| Identity uncertainty | Ambiguous identities are excluded from confident recommendations or visibly flagged for correction; the system does not silently choose a person/company association. |
| Role verification | A verified opening has directly retrieved official company or linked ATS evidence, a source URL, and a check timestamp. Search-only evidence cannot earn this label. |
| Honest output | Results contain no more than five recommendations and may contain none. Missing data, blocked pages, and exploratory connections remain visible. |
| Candidate-specific preparation | Each recommendation identifies supplied experience to discuss, gives a short introduction, and provides three relevant questions. It invents no candidate achievements. |
| Inspectable evidence | Material factual claims have accessible source references or are explicitly attributed to the user. Fit judgments and suggested conversation material are presented as generated interpretations. |
| Spending control | Live research reserves budget before model/search work, limits requests, and stops when the application threshold would be exceeded. Missing credentials cannot trigger a call. |
| Public demonstration | A portfolio visitor can explore a labeled saved example without credentials, live calls, or exposure of private resume contact fields. |
| Failure handling | Empty event data, insufficient evidence, blocked job pages, provider failures, and budget exhaustion produce understandable next steps without fabricated results. |
| Evaluation | A small documented set of real public pages exercises success, sparse evidence, and access limitations, alongside automated workflow and browser checks. |

Success at this stage means completing and explaining this workflow credibly. Interviews, referrals, revenue, or five completed conversations are possible downstream outcomes, not POC acceptance gates.

## User Stories

1. As the owner, I want my supplied career background prefilled, so that I can try the product without rebuilding my profile.
2. As the owner, I want to edit my target roles, so that matching reflects the opportunities I actually want.
3. As the owner, I want to correct skills and experience summaries, so that generated introductions represent me accurately.
4. As the owner, I want to include selected project and work-experience evidence, so that recommendations have concrete material to reference.
5. As the owner, I want to enter job preferences and optional hard constraints, so that I can distinguish a relevant company from an unsuitable opportunity.
6. As the owner, I want unspecified preferences to remain unknown, so that the product does not invent restrictions or eligibility assumptions.
7. As the owner, I want to submit a public event URL, so that I can prepare for an event from its published information.
8. As the owner, I want to paste event text when retrieval fails, so that an inaccessible page does not end the workflow.
9. As the owner, I want to see that pasted text is user-supplied, so that I do not mistake it for independently retrieved evidence.
10. As the owner, I want to see meaningful analysis progress, so that I know whether event reading, research, or brief preparation is underway.
11. As the owner, I want to see publicly named speakers, hosts, and presenting companies, so that the shortlist relates to the specific event.
12. As the owner, I want historical participants and remote speakers identified correctly, so that I do not plan an unsupported in-person approach.
13. As the owner, I want uncertain identities flagged, so that I can correct the input instead of acting on a mistaken association.
14. As the owner, I want concise company context, so that I understand why a conversation could be relevant.
15. As the owner, I want job openings checked against official sources, so that the brief distinguishes supported opportunities from speculation.
16. As the owner, I want a last-checked timestamp and direct job link, so that I can assess freshness myself.
17. As the owner, I want blocked or unreadable job pages reported honestly, so that an incomplete check is not presented as verification.
18. As the owner, I want relevant companies without verified openings labeled exploratory, so that useful connections remain visible without implying that they are hiring.
19. As the owner, I want “no opening found” distinguished from “not hiring,” so that incomplete research does not become a false claim.
20. As the owner, I want a shortlist of up to five opportunities, so that preparation stays focused.
21. As the owner, I want an explanation of each match and its missing evidence, so that I can judge its usefulness without trusting a mysterious score.
22. As the owner, I want the most relevant piece of my supplied experience highlighted, so that I know what to discuss.
23. As the owner, I want a short introduction tailored to each recommendation, so that I have a credible starting point for a conversation.
24. As the owner, I want three informed questions per recommendation, so that I can explore mutual relevance beyond asking for a job.
25. As the owner, I want to inspect the sources behind important factual claims, so that I can catch errors before an event.
26. As the owner, I want an explicit insufficient-evidence result, so that the product does not fill its shortlist with weak or invented matches.
27. As the owner, I want to revise my profile or pasted input and rerun analysis, so that I can correct mistakes without a separate administration workflow.
28. As the owner, I want provider and input failures to include practical next steps, so that I can recover without guessing.
29. As the owner, I want paid research limited and its spending tracked, so that development stays within my budget.
30. As a portfolio visitor, I want a working saved example, so that I can understand the product without accounts or API credentials.
31. As a portfolio visitor, I want to know that an example is saved and when its sources were checked, so that I do not mistake it for current research.
32. As a portfolio visitor, I want to inspect reasoning, evidence, and uncertainty, so that I can assess the engineering decisions behind the interface.
33. As a user on a phone or keyboard, I want readable, accessible controls and results, so that the brief is usable while preparing for an event.
34. As the owner, I want private live research separated from the public example, so that visitors cannot spend my API budget or access private inputs.

## Implementation Decisions

### Approved product and architecture decisions

- **One Next.js/TypeScript application.** Keep the interface and server-side research in one application. The original document's separate Python service, queue, and database architecture is not required for this POC.
- **Personal profile first.** Derive an initial editable profile from the supplied resume and public profile material. General-purpose resume ingestion is deferred.
- **Public event information only.** Analyze public speakers, hosts, and presenting-company relationships. Do not use authenticated attendee lists or hidden endpoints.
- **URL plus pasted text.** Support a narrow, demonstrated set of event-page inputs and provide a first-class fallback instead of claiming universal event-platform coverage.
- **Zero to five results.** Do not pad the shortlist. Relevant exploratory companies may appear, clearly separated from verified openings and below strong verified matches.
- **One economical model provider initially.** Use Gemini 3.1 Flash-Lite as the working default for structured extraction and generation, with search grounding where appropriate. The cost rationale depends on the account's available included search allowance; verify model access, capability compatibility, and current pricing before paid integration tests. Quality on this task has not yet been benchmarked.
- **An inspectable brief.** Expose evidence, freshness, uncertainty, candidate experience to mention, an introduction, and three questions.
- **Public example and private live analysis.** Public visitors do not get unrestricted research access.
- **A $10 development cap.** Track application spending and use an $8 stop threshold, preserving a $2 validation reserve.

### Profile defaults and unresolved preferences

| Field | Initial treatment |
|---|---|
| Primary target | Applied AI Engineer |
| Secondary targets | Forward-Deployed Engineer; Full Stack AI Engineer |
| Relevant experience | User-provided applied AI, RAG, agents, evaluation, backend systems, and customer deployments |
| Experience level | Roughly four years of listed professional experience; no automatic seniority requirement |
| Founding-engineer interest | Appears in public profile material; not a separate hard filter or claim of seniority |
| Bay Area and remote | Suggested preferences, not mandatory filters |
| Relocation, employment type, company stage | Unknown until edited by the owner |
| Work authorization or sponsorship | Unknown; never inferred from name, education, nationality, or employment history |

The user approved the scope without supplying additional hard job constraints. Do not silently turn these defaults into restrictive eligibility rules.

### Logical components

These are implementation boundaries inside one application, not independently deployed services:

1. **Profile editor:** prepares the owner's structured, editable career context.
2. **Analysis coordinator:** accepts profile and event input, manages the bounded workflow, and returns results or explicit partial/failure states.
3. **Source research:** reads permitted public event/company/job material and records evidence and retrieval status.
4. **Matching and brief preparation:** evaluates supported fit, orders recommendations, and generates introductions/questions from the available evidence.
5. **Brief interface:** presents the public example or owner results, including source inspection and corrections through revised input.
6. **Budget accounting:** reserves spending before calls, records usage, and prevents further work at the application threshold.

### Data and behavioral contracts

- **Analysis input:** an editable profile and either a public event URL or pasted public event text. Pasted text may also carry a source URL, but that URL alone does not make the content independently verified.
- **Evidence record:** a fact or compact supporting excerpt, source URL when available, source kind, retrieval/check time, relevant entity, and verification/uncertainty status. Distinguish public retrieval from user-supplied material.
- **Event relationship:** the named person or company, its explicit connection to the event, supporting evidence, and any known attendance modality. Do not convert a company's sponsorship into an invented individual participant.
- **Job evidence:** title, company, source URL, check time, and whatever requirements/location information the retrieved official source actually supports. Do not fill missing requirements from assumptions.
- **Recommendation:** person or company, event relationship, verified-opening or exploratory status, supported fit explanation, relevant candidate experience, source references, missing information, introduction, and three questions.
- **Analysis output:** event context, zero to five recommendations, consulted evidence, warnings, and a success, partial, or insufficient-evidence outcome. Operational failures remain distinguishable from a completed search that found no useful matches.
- **Progress:** show actual completed stages; do not simulate completed research while the work has not occurred.
- **Corrections:** editing and rerunning the profile/event input is sufficient for this POC. A separate entity-resolution administration interface is not required.

### Verification and matching policy

- Search is a discovery aid. A search result or generated citation alone cannot verify a current opening.
- Retrieve an official company careers page or an ATS listing demonstrably associated with that company. Verify only what the retrieved content supports, and exclude explicit closed/expired listings.
- “Verified” means the official source listed the opening when checked. It does not guarantee that the job remains available or that the employer will consider the candidate.
- Preserve partial evidence. For example, an official careers page may support a role title while an unreadable detail page leaves its requirements unverified.
- Do not claim a founder is hiring, attending in person, or willing to refer the owner without corresponding evidence.
- Prefer strong verified role matches over exploratory connections. Keep candidate relevance, event relevance, opportunity evidence, and uncertainty inspectable.
- Use reproducible ranking rules over extracted, supported information. Generative explanations must not silently invent a suitability score.
- The original document's numeric scoring weights were not validated or specifically adopted. Exact weights and visible numeric scores are not POC requirements. Explanations and evidence matter more than false precision.
- Treat fetched content as source data, not instructions to the application or model.

### Implementation defaults to apply within the approved scope

The following details make the approved scope executable; they are engineering defaults rather than separately requested features:

- Keep model credentials on the server and outside version control. The user reports access to three providers, but credentials have not been configured or tested for this application.
- Disable live-analysis routes in the public demo environment, not merely the visible button. Local owner use avoids adding a full account system.
- Bound source count, input size, model output, search activity, retries, and duration. Check public URL destinations and redirects so user-supplied URLs cannot fetch local or private-network resources.
- Reserve a conservative upper-bound cost before each paid operation and account for concurrent work. Persist the local usage ledger across restarts; fail closed if budget accounting is unavailable.
- Include model and search charges in the application ledger. If usage cannot be measured or bounded adequately, disable that live operation rather than claim a hard cap.
- The ledger controls this application only. It cannot enforce total spending from other applications using the same provider account. Provider alerts are not a substitute for application limits.
- Use selected professional profile fields for the public example. Do not publish the original resume, phone number, email address, or private inputs as part of the demo.
- Preserve only the small amount of data required for owner use and the curated example. Accounts, shared databases, long-term people directories, and retention automation are unnecessary for this POC.
- A sample must be labeled saved or historical as appropriate. Its event date and source-check dates must not imply that a past event or old opening is current.

## Testing Decisions

**Confirmed with the user:** test the full event-analysis workflow—profile and event in, recommendations or a clear failure out—plus a small set of browser checks.

### Primary seam

Use the application-level analysis boundary as the main test seam. Exercise input handling, public-source interpretation, verification, matching, brief output, and failure behavior through that boundary. Replace external network/provider responses with controlled fixtures so normal tests are repeatable and incur no API charges.

Fixtures represent external systems; assertions must inspect the application's returned behavior, evidence, and user-visible state, not mock call counts or internal helper structure. Add lower-level tests only where a critical invariant, such as concurrent budget reservation or URL validation, cannot be covered clearly through the main seam.

### Required behavioral coverage

| Scenario | Expected behavior |
|---|---|
| Public event with a relevant speaker and readable official role | Supported recommendation with distinct event/job evidence, fit explanation, introduction, and three questions |
| Profile changes | Recommendation fit or explanation responds to the submitted profile rather than a fixed saved persona |
| Event retrieval fails | URL failure is explicit; pasted public text can complete the same workflow |
| No named targets | Insufficient-evidence result; no invented attendees |
| Historical attendee list or remote speaker | No unsupported claim that the person is available for an in-person conversation at this event |
| Ambiguous person/company identity | Exclusion or visible uncertainty, not an unqualified association |
| Search snippet suggests an opening, official page unreadable | No verified-opening label based solely on the snippet |
| Official source explicitly says role is closed | Opening is excluded from current verified opportunities |
| Relevant company has no verified opening | Exploratory label; no assertion that the company is not hiring |
| Only one or two credible matches | Return only those matches; never pad to five |
| Brief generation introduces unsupported facts | Reject or omit unsupported claims and preserve uncertainty |
| Source text contains instructions | Instructions cannot alter the research policy, disclose secrets, or authorize additional actions |
| Provider timeout or malformed response | Bounded failure or partial result with a useful next step; no unlimited retries |
| Budget threshold or unavailable ledger | Paid work does not start; user sees the spending limitation |
| Concurrent analyses near the budget threshold | Combined reservations cannot bypass the application limit |
| Private-network URL or unsafe redirect | Fetch is rejected before accessing the restricted destination |
| Public demo request | Saved example remains usable; live research is unavailable even through a direct request |

### Browser checks

- Review and edit the profile; submit event input and inspect the resulting brief.
- Open a saved example, expand a recommendation, and follow its evidence links.
- Exercise loading, empty, partial, credential-missing, budget-exhausted, and failure states.
- Check a narrow mobile viewport, visible keyboard focus, labels, and keyboard access to primary controls.
- Confirm the public demo contains no model credentials or private profile fields.

### Real-source evaluation

Use a small set of real public pages that includes a useful named-speaker event, a sparse event, and a page with retrieval limitations. Record input URLs, check dates, expected evidence, returned recommendations, unsupported claims, and observed cost. Review results against the actual sources. A past event is acceptable as a clearly labeled evaluation fixture, not as a current event recommendation.

The real-source evaluation complements fixture-based tests; it does not turn every automated test into a paid or network-dependent check. Do not claim verified quality until the evaluated results support it.

### Existing test infrastructure

None. The workspace was empty and was not a Git repository when inspected. There are no existing modules, tests, domain glossary, ADRs, or test seams to preserve. Test tooling will be chosen to fit the single TypeScript application.

## Out of Scope

- A commercial launch, business-model validation, pricing plans, subscriptions, or customer acquisition.
- A required two-week concierge-validation phase before building.
- General-purpose resume upload/parsing for arbitrary users; the first profile is prepared from the owner's supplied material.
- User accounts, multi-tenant storage, team workspaces, or an organizer dashboard.
- Publicly available, unrestricted live research.
- Personal CRM, interaction tracking, follow-up reminders, calendar integration, or outcome analytics.
- Pre-event and post-event message-drafting workflows beyond the agreed in-person introduction and questions.
- MCP integration, browser extensions, organizer-authorized attendee APIs, and additional event-platform adapters beyond those needed to demonstrate the flow.
- Hidden or authenticated attendee scraping, session-cookie reuse, LinkedIn scraping, personal contact discovery, and automated sending.
- A searchable people database, bulk export, or resale of event-derived profiles.
- Universal event-page compatibility, complete attendance coverage, and guaranteed availability of ATS pages.
- Claims about hiring intent, eligibility, attendance, approachability, or referral willingness without supporting evidence.
- A separately deployed Python API, background-worker fleet, vector database, or other infrastructure not justified by the POC.
- A universal candidate score, calibrated probability of an interview, or fixed numerical scoring formula.
- Production legal/compliance certification or claims that public accessibility alone grants every reuse permission.

## Further Notes

### What supersedes the original product plan

The original “Event Opportunity Copilot — Product Plan, Research Findings, and Build Specification” supplied useful product context. Its instructions and roadmap were proposals, not implementation authorization. The subsequent conversation narrowed the work to a solo personal portfolio POC.

This PRD carries forward public-source research, evidence-backed matching, official job verification, and focused conversation preparation. It deliberately removes the original account system, general resume ingestion, CRM, broader infrastructure, commercial validation program, and MCP roadmap from the first release.

### Source material and evidence limits

- The owner's supplied resume informed the initial experience summary and matching strengths. Its claims were not independently verified with employers.
- [GitHub profile](https://github.com/Bsahoo99) and [personal portfolio](https://www.biswajeetsahoo.me/) supplied public career/project context.
- The supplied [LinkedIn profile](https://www.linkedin.com/in/sahoobiswajeet) was not successfully read during planning; the access limitation was not bypassed. No requirement depends on extracting it.
- [Gemini model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite) and [API pricing](https://ai.google.dev/gemini-api/docs/pricing) informed the provisional provider choice. Availability, search allowances, and actual per-analysis costs require verification during implementation.
- The original plan's market, competitor, and legal claims are not treated as independently validated requirements in this PRD.

### Remaining implementation checks

These are checks to resolve while building, not reasons to reopen the product interview:

1. Confirm the selected model is available through the owner's account and supports the required workflow.
2. Configure credentials securely and establish reliable usage accounting before a paid call.
3. Select the public event pages and saved example; preserve source and event dates.
4. Choose exact ranking rules and evaluate whether the explanations are specific and credible.
5. Choose persistence and hosting compatible with a public saved example and private owner research.
6. Keep unprovided job constraints unknown and editable.

### Publication status

This PRD is saved locally. No project issue tracker or triage-label configuration was available. No issue has been created and no `ready-for-agent` label has been applied. Run `/setup-matt-pocock-skills` to establish the project's issue-tracker configuration before publishing through the to-spec workflow. Missing tracker configuration does not prevent review or use of this local PRD.
