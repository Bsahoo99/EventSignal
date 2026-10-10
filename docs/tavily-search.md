# Tavily discovery migration

The user selected Tavily on October 10, 2026 to use its recurring free tier. Review baseline: `f9732fd9057546c6bbe9f43d044f24caf539fb6c`.

- Replace Brave with Tavily; read TAVILY_API_KEY only on the owner server. No automatic fallback to the invalid Brave key.
- Use POST /search with Bearer authentication, search_depth basic, auto_parameters false, max_results five, topic general, and generated answers, raw content, and images disabled. Keep the existing timeout, response-size cap, no retries, and safe official-site verification.
- Map Tavily results title/url/content to discovery candidates. Missing or malformed result envelopes are failures, not proof of no results. Snippets cannot verify an opening.
- Use the existing $8 ledger without resetting earlier charges. Reserve $0.10 before a provider request; reconcile completed Basic searches to the conservative $0.008 paid rate. Unknown failures retain reservations. Free provider credits are not presumed available.
- Retain the 24-hour bounded cache, but namespace Tavily entries so old Brave results cannot suppress new discovery. Re-read official sites for current job evidence.
- Update configuration and owner guidance. Keep manual company websites available without a search key.
- Validate at the existing analyze seam with external HTTP/page fixtures. Live validation needs the user's Tavily key. Finish independent Standards and Spec reviews and commit on the current branch.
