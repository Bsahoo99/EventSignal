# Bounded company discovery

The owner authorized improving the missing-company-link workflow on October 10, 2026, and agreed to configure a Brave Search API key. Review baseline: `8ada36d`.

## Scope

- Use event links first, or an owner-supplied company website. Otherwise make at most one Brave Web Search request per unique company, for at most five companies per analysis.
- Search is discovery only. Fetch candidate sites through the existing safe public reader. Cross-check company identity and event-specific context; ambiguous or unreadable candidates remain unverified. Never promote a search snippet or standalone ATS result to an official opening.
- Support a manual company/website input for correction or missing search credentials. It cannot bypass public-URL protections or directly verify an opening.
- Cache public search results for 24 hours; re-read official pages for current job evidence. Do not cache profiles, secrets, or inferred job availability.
- Count search requests conservatively in the existing durable $8 ledger, including unknown failures. Do not assume free provider credits or reset the ledger.
- Show clear per-company statuses and next steps: search unavailable, website not identified, identity ambiguous, page unreadable, research limit, no matching opening, or official opening found. Retain useful exploratory leads.
- Accept HTML up to 1 MB while retaining the 20,000-character extracted text limit, public-address checks, and existing timeouts. Live company pages exceeded the former 250 KB cap.
- Keep official job verification, hard-constraint handling, and the five-result maximum intact. Explain supported event roles separately from official openings.

Use the PRD-approved application analysis seam with controlled external provider/page fixtures, plus owner UI validation. Gemini grounding stays disabled; Brave supplies bounded URL discovery. Follow with independent Standards and Spec reviews, then commit the changes.
