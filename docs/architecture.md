# Architecture — Incident War Room

## Components

1. **Sanity dataset** — holds `responder`, `incident`, `timelineEvent`, `escalationApproval`, `runbook`, `postmortem`, `statusPageEntry` (see `schema.md`).
2. **Next.js frontend**:
   - Incident list + detail view, timeline rendered from `timelineEvent` documents ordered by `createdAt`.
   - Subscribes to Sanity's real-time `listen()` API on `timelineEvent` (filtered by `incident._ref`) so every open viewer sees new events the instant they're created — no polling, no refresh.
   - Severity-change UI: raising an incident to SEV1 creates an `escalationApproval` document with `status: pending`, not an immediate severity change.
   - Approval UI: on-call leads see pending approvals and can approve; each approval appends to `escalationApproval.approvals`.
3. **Sanity Workflows** — configured on `escalationApproval`:
   - Transition `pending → approved` is gated on `approvals.length >= requiredApprovals` (2 for SEV1).
   - The `approved` transition is the only path that is allowed to trigger creation of a `statusPageEntry` and to flip the linked `incident.status` to `escalated`.
   - This is real gating, not a UI-only check — the transition itself enforces the rule, so it can't be bypassed by calling the write API directly.
4. **App SDK — "Ops Dashboard" custom Studio tool**:
   - Runs cross-document GROQ aggregations: mean time to resolution (from `incident.openedAt` to `incident.resolvedAt` across all resolved incidents), count of currently open incidents by severity, count of pending escalation approvals.
   - Renders as a small chart/stat panel inside Sanity Studio, refreshed live.
5. **Postmortem generation**:
   - On `incident.status → resolved`, a script (or Studio action) copies every linked `timelineEvent` into `postmortem.timelineSnapshot` as plain objects (not references), freezing the record at that moment.

## Why the concurrency model matters here (build documentation angle)

The obvious design — an array of timeline entries on the `incident` document — forces every concurrent edit through optimistic locking on the same document, the same problem Patchwork solved for translation strings. Incident War Room sidesteps it structurally: each `timelineEvent` is its own document, so two responders posting updates at the same second never touch the same document and never conflict. This is worth calling out explicitly in the submission post as a deliberate schema decision, not an accident.

## Build order (suggested)

1. Schema first — `responder`, `incident`, `timelineEvent` in Studio; seed 2–3 fake responders and one incident.
2. Frontend timeline view + `listen()` subscription — prove real-time updates work with two browser tabs open.
3. `escalationApproval` + Workflow transition — this is the feature that most directly hits "Workflows used for real functionality."
4. `statusPageEntry` creation on approval.
5. `postmortem` snapshot generation on resolution.
6. App SDK Ops Dashboard last — it's a read layer over data the rest of the system already produces.

## What to capture for the submission post

- Sanity project ID / public dataset URL (required by the challenge).
- A short demo: two browser tabs showing live timeline sync, a SEV1 escalation stuck in `pending` until a second approver signs off, then the resulting `statusPageEntry` appearing.
- A screenshot or clip of the App SDK Ops Dashboard showing cross-incident MTTR.
- An honest build-process note on what was hard — e.g. getting the Workflow transition to reliably gate on approval count, or any real-time edge cases hit during testing. The strongest submissions in this track (Round Chat, Cryptid Field Station) all included this kind of honesty; it should carry over here.
