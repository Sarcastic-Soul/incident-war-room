# Incident War Room: an incident-response tool where the approval gate and the AI can't be faked out

**Live demo:** https://incident-war-room-nine.vercel.app
**Repo:** https://github.com/Sarcastic-Soul/incident-war-room
**Sanity project:** `am9ihg1w` / dataset `production`
**Testing credentials:** see [`docs/testing-credentials.md`](https://github.com/Sarcastic-Soul/incident-war-room/blob/master/docs/testing-credentials.md) in the repo — there are two on-call-lead accounts on purpose, you need both to see the escalation gate go through end to end.

{% embed https://youtu.be/5JVUoHkKi0c %}

## What it is

Incident War Room is a real-time incident-management app: a live timeline per
incident, a severity-escalation approval gate, AI-drafted postmortems,
related runbooks surfaced by severity, and a custom ops dashboard inside
Sanity Studio. Built with Next.js 16 (App Router)
on the front end and Sanity as the backend, for the dev.to × Sanity Path Two
challenge — prompt an AI-native IDE to build a working Next.js/Astro + Sanity
app, with bonus points for real use of **Sanity Workflows** and the
**Sanity App SDK**.

![Incidents list](https://raw.githubusercontent.com/Sarcastic-Soul/incident-war-room/master/docs/screenshots/incidents-list.png)

The goal going in was to avoid the thing that's easy to do with both of
those bonus features: wire them up just to check a box. So both had to do
something a judge could try to break.

## The part that has to actually work: the SEV1 approval gate

Raising an incident to SEV1 doesn't change its severity. It creates an
`escalationApproval` document with `status: "pending"` and
`requiredApprovals: 2`. The incident stays exactly where it was until two
*distinct* on-call leads approve.

That gate is modeled as a **Sanity Workflow** on `escalationApproval`
(`pending → approved / rejected`) — it shows up as a Kanban board in Studio.
But `sanity-plugin-workflow`'s own README says its transitions are
enforced client-side only. So the actual rule — you need 2 approvals, not 1,
not the same person twice — lives in a Next.js Server Action
(`approveEscalation` in `src/app/incidents/[id]/actions.ts`), which is the
*only* code path allowed to flip the approval to `approved`. Once it does,
that same function:

- flips the incident to `severity: "SEV1", status: "escalated"`
- creates a `statusPageEntry` document
- optionally POSTs to an external status-page webhook (opt-in via
  `STATUS_PAGE_WEBHOOK_URL`; unset means it's a no-op, never blocks the
  transition)

The approver is never taken from the request. It's whoever the signed
session cookie says is logged in, and the server checks that they're an
on-call lead and haven't already approved. The write uses `ifRevisionId`,
so two leads approving at the same moment can't both be counted as "the
first". Bob (an engineer) doesn't even get a button, and Alice can't sign
for Dana.

A judge can try to escalate with one approval, or the same approver twice,
and watch it get blocked. That's the point.

![One of two approvals: the incident is still SEV3](https://raw.githubusercontent.com/Sarcastic-Soul/incident-war-room/master/docs/screenshots/pending-approval.png)

## Schema decision I'd defend: timeline events aren't an array

The obvious schema is `incident.timelineEvents: [...]` — an array field you
append to. That design forces every concurrent edit through optimistic
locking on the same document. Instead, each timeline entry is its own
`timelineEvent` document, referencing its incident. Two responders posting
updates in the same second never touch the same document, so there's
nothing to lock. The Next.js frontend subscribes to Sanity's real-time
`listen()` API filtered by `incident._ref`, so every open tab sees new
events instantly — no polling.

The same "don't let this get rewritten" instinct shows up in `postmortem`:
resolving an incident copies every linked `timelineEvent` into
`postmortem.timelineSnapshot` as **plain objects, not references**. Later
edits to the live timeline can't quietly change what the postmortem says
happened.

## Where the App SDK earns its place: a dashboard that can write, not just read

The Ops Dashboard is a custom Studio tool built with `@sanity/sdk-react`
(the App SDK) — `useQuery` runs a single cross-document GROQ aggregation for
mean-time-to-resolution, open-incident counts by severity, and pending
escalation approvals, all live.

It started read-only, which felt like the same "bonus feature as decoration"
trap. So it also renders an approve button per pending escalation — wired
to the *exact same* `approveEscalation` Server Action the incident page
uses. Same gate, same 2-approver rule, same "you approve as whoever you're
logged in as", called from inside Sanity Studio instead of the app. No
separate, weaker write path just because it's convenient.

## Where an actual agent moves the work forward

This is the piece I added specifically because "an agent moves a draft
forward" is one of the more interesting ways to use AI in a workflow, and it
was missing from the first pass. When `resolveIncident` runs, it hands the
frozen timeline to Groq's `openai/gpt-oss-120b` and asks for a root cause
paragraph and up to three action items — grounded only in what's actually in
the timeline, with an explicit instruction to say "unknown" rather than
invent a cause if the timeline doesn't support one.

That draft lands in the postmortem automatically. A human still owns it: a
custom Studio input component (`RootCauseInput.tsx`) wraps the default text
field with a "Regenerate with AI" button, so an editor can ask for another
pass any time — not just once, at resolution.

It's off by default: no `GROQ_API_KEY` means the postmortem is just created
blank, same as before this existed. It never blocks resolution if the call
fails.

![Escalated, published to the status page, resolved, and the AI-drafted postmortem](https://raw.githubusercontent.com/Sarcastic-Soul/incident-war-room/master/docs/screenshots/escalated-and-postmortem.png)

## What was actually hard

**The Workflow plugin doesn't enforce anything.** I expected
`sanity-plugin-workflow` to be the gate. Its transitions only run in the
Studio UI, so anyone with a write token (or the app itself) can set
`status: "approved"` directly. The board is still useful for seeing where
every escalation stands, but the actual rule had to move into a Server
Action that is the only thing allowed to finish the transition.

**My first gate could be faked.** The first version counted approvals
correctly but took the approver's id from a hidden form field and showed an
"Approve as …" button for every on-call lead. So Alice could click
"Approve as Alice", then "Approve as Dana", and push a SEV1 through alone:
exactly what the gate exists to stop. I only caught it while recording the
demo. Now the approver comes from the signed session, and the server checks
role, duplicates and the document revision.

**`listen()` doesn't run your projection.** The live timeline subscribes to
`*[_type == "timelineEvent" && incident._ref == $id]{..., author->{name}}`,
and I assumed the join came along. It doesn't: `listen()` sends the whole
document, so new posts arrived with `author` as a bare reference and showed
up as "Unknown responder". The fix is to match the reference against the
responder list the page already has.

**Two clocks on one page.** Dates were formatted with `toLocaleString()`.
On Vercel the server renders in UTC, but the live timeline renders in the
browser's zone, so one page showed "Opened 5:01 PM" above an update at
"10:32 PM". Everything is formatted in UTC now, like most incident tools do.

## Try it

1. Log in as `alice@example.com` / `demo1234` (prefilled).
2. Open the sample incident, raise it to SEV1.
3. Approve as Alice — notice it's still pending.
4. Click **Log out**, log in as `dana@example.com` / `demo1234`, open the same incident and approve — watch it flip to SEV1 / `escalated` and a status page entry appear.
5. Click **Mark resolved** — the timeline is frozen into a postmortem with an AI-drafted root cause and action items.
6. Log in as `bob@example.com` (an engineer) and see that you can't approve at all.
7. If you have access to the Sanity project, open `/studio` for the Workflow board, the Ops Dashboard tool and the "Regenerate with AI" button.

Repo, schema docs, and architecture notes are all in
[github.com/Sarcastic-Soul/incident-war-room](https://github.com/Sarcastic-Soul/incident-war-room).

<sub>Demo video music: "Wallpaper" by Kevin MacLeod (incompetech.com), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).</sub>

#sanitychallenge
