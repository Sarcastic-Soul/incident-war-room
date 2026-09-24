# Sanity content schema — Incident War Room

## `responder`
- `name` (string)
- `role` (string, e.g. `on-call-lead`, `engineer`, `comms`)
- `onCallTeam` (string)

## `incident`
- `title` (string)
- `severity` (string, enum: `SEV1`, `SEV2`, `SEV3`, `SEV4`)
- `status` (string, enum: `investigating`, `mitigated`, `resolved`, `escalated`)
- `owner` (reference to `responder`)
- `openedAt` (datetime)
- `resolvedAt` (datetime, optional)

## `timelineEvent`
Append-only — each update is its own document, not an entry in an array field on `incident`. This is deliberate: independent documents can be created concurrently by different responders with zero merge conflicts, which sidesteps the optimistic-locking complexity that array-field designs (like Patchwork's) need to handle.
- `incident` (reference to `incident`)
- `author` (reference to `responder`)
- `eventType` (string, enum: `update`, `statusChange`, `severityChange`)
- `body` (text)
- `createdAt` (datetime)

## `escalationApproval`
Represents one severity-escalation request and its approval state. Created when someone tries to raise an incident to SEV1.
- `incident` (reference to `incident`)
- `requestedSeverity` (string)
- `requiredApprovals` (number — 2 for SEV1)
- `approvals` (array of objects: `{ approver (reference to responder), approvedAt (datetime) }`)
- `status` (string, enum: `pending`, `approved`, `rejected`)

Managed through a Sanity Workflow: `pending` → `approved` is a workflow transition gated on `approvals.length >= requiredApprovals`, and only the `approved` transition is allowed to trigger creation of a `statusPageEntry`.

## `runbook`
- `title` (string)
- `applicableSeverity` (array of strings)
- `steps` (portable text)
- `linkedIncidents` (array of references to `incident`)

## `postmortem`
- `incident` (reference to `incident`)
- `timelineSnapshot` (array of plain objects — a **copied, frozen** snapshot of every `timelineEvent` at resolution time, not references; this is what makes the audit trail immutable, since later edits to live `timelineEvent` documents cannot change what the postmortem shows)
- `rootCause` (text)
- `actionItems` (array of strings)
- `publishedAt` (datetime)

## `statusPageEntry`
- `incident` (reference to `incident`)
- `publicSummary` (text)
- `publishedAt` (datetime)
- Only created by the workflow transition when an `escalationApproval` reaches `approved` for a public-facing severity.

## Why this shape

- Splitting `timelineEvent` into its own append-only document type (instead of an array on `incident`) is the core schema decision: it turns a concurrency problem (multiple responders editing one document's array field) into a non-problem (multiple responders each creating their own document).
- `escalationApproval` is a first-class document, not a boolean flag, because the approval process itself needs an audit trail — who approved, when, and how many were required.
- `postmortem.timelineSnapshot` is a deliberate denormalization: copying data instead of referencing it is what gives the audit trail its immutability guarantee.
