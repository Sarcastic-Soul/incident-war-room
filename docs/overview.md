# Incident War Room — Path Two Submission Plan

## What this is

A real-time, collaborative incident-management app for engineering teams: a live incident timeline, runbooks, severity-based escalation approvals, and post-incident audit trails — built with a Next.js frontend and a Sanity backend, using **Sanity Workflows** for approval gating and the **App SDK** for a custom ops dashboard inside Sanity Studio.

This is a Path Two submission: AI-native IDE builds a working app (Next.js frontend, Sanity backend), with the App SDK and Workflows bonus features used for real functionality, not decoration.

## Why this beats the current top Path Two submissions

Three submissions currently sit at 8.5–9/10 in this track:

- **"Round Chat"** — a floating partner chat for debate rounds; strong live-edit concurrency handling and an App SDK dashboard tool.
- **"Cryptid Field Station"** — a full working multi-app system (report form, live triage, Studio) with a workflow-as-data pattern and real-time `listen()` updates.
- **"Patchwork"** — translation staleness tracking with a 5-document-type schema, optimistic-locking concurrency, and 20 tests.

Each is strong, but all three are built around a single-writer or low-stakes domain (a debate chat, cryptid reports, translation strings). Incident War Room targets a higher-stakes, multi-actor domain where the judging criteria (schema thoughtfulness, app functionality, build documentation) have more to prove against:

1. **Schema depth with real consequences** — the schema models severity levels, escalation approvals, and postmortems as first-class documents with an *immutable audit trail*: a postmortem references a frozen snapshot of the timeline at the moment of resolution, so history can't be silently rewritten after the fact. This is a harder schema problem than a single flat document type.
2. **Sanity Workflows used for actual gating, not a label** — a SEV1 incident cannot be marked "escalated" until two distinct approvers (via Workflows) sign off; the workflow state is enforced server-side, not just shown in the UI.
3. **App SDK dashboard with cross-document analytics** — a custom Studio tool computes MTTR (mean time to resolution) and escalation counts across every incident, not just within one document, showing the App SDK can drive real operational reporting.
4. **Real-time collaboration under genuine contention** — multiple responders editing the same incident timeline simultaneously (like Round Chat's concurrency handling), but with the added twist that severity changes must survive the approval workflow even while the timeline keeps updating live.

The domain (incident response) is something judges immediately recognize as a real, high-stakes use case, which raises the bar for what "app functionality" needs to prove.

## Core user flow

1. An engineer opens an incident; it appears live for every responder viewing it (real-time `listen()`).
2. Responders add timeline events (investigating, mitigated, root cause found) — all viewers see updates instantly.
3. If someone raises severity to SEV1, a Sanity Workflow starts: two on-call leads must approve before the incident is marked "escalated" and a public status page entry publishes.
4. On resolution, a postmortem document is created referencing a frozen snapshot of the full timeline — later edits to the incident do not change what the postmortem shows.
5. The Ops Dashboard (App SDK tool in Studio) shows live MTTR and open-incident counts across the whole organization.

See `architecture.md` for technical design, `schema.md` for the Sanity content model, and `why-it-wins.md` for a point-by-point comparison against the three competing submissions.
