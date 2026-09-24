# Why this beats the current top Path Two submissions

Comparison against the three top-scored Path Two posts found when scoring current submissions at https://dev.to/t/sanitychallenge/latest.

| Competitor | Strength | What Incident War Room does differently |
|---|---|---|
| **Round Chat** (9/10) — https://dev.to/claire_y/round-chat-a-floating-partner-chat-for-debate-rounds-2ko2 | Live-edit concurrency handling, App SDK dashboard tool, 11-section build doc | Same real-time depth, but concurrency is solved structurally (append-only `timelineEvent` documents) instead of handled at edit time — a stronger schema-level answer to the same problem |
| **Cryptid Field Station** (9/10) — https://dev.to/aniruddhaadak/i-vibe-coded-a-cryptid-reporting-station-on-sanity-and-the-workflow-rejects-bigfoot-blurs-cmc | Full working multi-app system, workflow-as-data pattern, real-time `listen()`, honest failure notes | Uses actual Sanity Workflows for approval gating (not a workflow-as-data simulation), with a concrete two-approver rule that's easy for a judge to verify by trying to skip it |
| **Patchwork** (8/10) — https://dev.to/touko_ursin_77fed0aa92ca0/patchwork-translations-that-know-when-theyre-out-of-date-published-through-sanity-n49 | 5-document schema, optimistic locking, 20 tests, real editorial use case | Sidesteps the concurrency problem Patchwork solves with locking by making the contended resource (the timeline) a set of independent documents instead of one shared array field |

## The one thing that raises the bar

All three competitors operate in low-stakes domains (a debate chat, cryptid reports, translation strings) where "what happens if this fails" has no real consequence. Incident War Room's domain — production incident response — means the judging criteria have something real to bite into:
- **Schema thoughtfulness**: the postmortem's frozen `timelineSnapshot` has to solve an actual audit-trail problem (can history be rewritten after the fact?), not just model data.
- **App functionality**: the escalation approval flow has a genuine wrong answer (a SEV1 escalates without two approvers) that a judge can try to trigger and watch get blocked.
- **Build-process documentation**: getting a Workflow to correctly gate a transition on a computed condition (approval count) is a harder, more interesting build story than wiring up a chat UI.

## Judging criteria fit

The challenge's stated Path Two criteria are build-process documentation, app functionality, and schema thoughtfulness, with bonus points for App SDK or Workflows. Incident War Room uses both bonus features for functionality that matters (approval gating, cross-incident analytics) rather than as a feature checklist, which is the gap between this and the current top three.
