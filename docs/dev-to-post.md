*This is a submission for the [Sanity Challenge, Path Two: Vibe-Code Something Strange](https://dev.to/challenges/sanity-2026-09-16)*

## What I Built

**Incident War Room** is an incident-response app for on-call teams. When
something breaks at 2 AM, everything about the incident lives on one page:

- a **live timeline** that every responder sees update in real time, no refresh
- a **SEV1 escalation gate**: raising an incident to SEV1 needs sign-off from
  **two different on-call leads** before anything changes, and it's enforced
  on the server, not just hidden in the UI
- a **status page entry** published automatically once the escalation is approved
- **runbooks** for the incident's severity shown right on the page
- an **AI-drafted postmortem**: resolving freezes the timeline and an LLM
  drafts the root cause and action items from it
- an **Ops Dashboard** inside Sanity Studio, built with the App SDK, that
  can approve escalations too, through the same gate

It's built with Next.js 16 (App Router) and Sanity as the whole backend.

![Incidents list](https://raw.githubusercontent.com/Sarcastic-Soul/incident-war-room/master/docs/screenshots/incidents-list.png)

## Demo

**Live app:** https://incident-war-room-nine.vercel.app

{% embed https://youtu.be/5JVUoHkKi0c %}

**Try the gate yourself** (all passwords are `demo1234`):

1. Log in as `alice@example.com` (prefilled), open the sample incident and click **Raise to SEV1**.
2. Approve as Alice. It stays at **1 / 2** and the incident is still SEV3.
3. Click **Log out**, log in as `dana@example.com`, open the same incident and approve. It flips to SEV1 / escalated and a status page entry appears.
4. Click **Mark resolved**. The timeline is frozen into a postmortem with an AI-drafted root cause and action items.
5. Log in as `bob@example.com` (an engineer): you can't approve at all.

![One of two approvals: the incident is still SEV3](https://raw.githubusercontent.com/Sarcastic-Soul/incident-war-room/master/docs/screenshots/pending-approval.png)

![Escalated, published to the status page, resolved, and the AI-drafted postmortem](https://raw.githubusercontent.com/Sarcastic-Soul/incident-war-room/master/docs/screenshots/escalated-and-postmortem.png)

## Code

{% embed https://github.com/Sarcastic-Soul/incident-war-room %}

The schema is documented in `docs/schema.md` and the design in
`docs/architecture.md`.

## My Build Process

I built the whole thing with **Claude Code**. Before any code, I had it
write planning docs (`docs/overview.md`, `docs/architecture.md`,
`docs/schema.md`) so each later prompt had a fixed target: a schema, the
rules for the escalation gate, and what "real" use of Workflows and the
App SDK meant. My rule for both bonus features was that a judge should be
able to try to break them.

**Where the model got stuck, and how I corrected it:**

- **Next.js 16 is newer than the model.** The repo has an `AGENTS.md` that
  tells the agent to read the docs bundled in `node_modules/next` before
  writing code, because APIs changed. That's how it got things like
  `middleware` being renamed to `proxy` right, instead of writing
  last year's Next.js from memory.
- **The Workflow plugin doesn't enforce anything.** The plan was to make
  `sanity-plugin-workflow` the gate. Its transitions only run in the
  Studio UI, so anything with a write token can set `status: "approved"`
  directly. The Kanban board stayed, to track where each escalation stands,
  but the real rule moved into a Server Action (`approveEscalation`) that
  is the only code path allowed to finish the transition.
- **A gate that could never open.** The first seed data had only one
  on-call lead, so the two-approver gate sat at 1 / 2 forever. It looked
  like it worked, but it could never finish.
- **Features that were only there on paper.** A `runbook` schema existed
  in Studio, but nothing in the app read it, and the page title was still
  "Create Next App". Asking the agent "what's unused or unfinished?" found
  more than asking it to "add a feature".
- **My first gate could be faked.** Near the end I asked Claude Code for a
  status check and then to "do all the things required for this project".
  Before recording the demo, it read `approveEscalation` and pointed out
  that the approver id came from a hidden form field, with an
  "Approve as …" button for every lead. Alice could approve as herself
  *and* as Dana and push a SEV1 through alone, which is exactly what the
  gate is for. Now the approver is whoever the signed session says is
  logged in, must be an on-call lead, can't approve twice, and the write
  uses `ifRevisionId` so two approvals at the same moment can't both count
  as "the first".
- **Bugs you only see by clicking through.** Recording the demo also turned
  up: `listen()` ignores GROQ projections, so live posts arrived with
  `author` as a bare reference and showed "Unknown responder"; events the
  server added (escalation, resolution) didn't show up because the client
  kept its first list; and the page showed two different clocks (UTC from
  the server on Vercel, local time from the browser). All fixed, all found
  by driving the live site with Playwright, not by reading code.

**Reaching past the Studio:**

- **Workflows.** `escalationApproval` is a Sanity Workflow
  (`pending → approved / rejected`), shown as a Kanban board in Studio.
  Once the Server Action counts two approvals, it flips the incident to
  SEV1 / escalated, creates a `statusPageEntry`, adds a timeline event and
  can POST to an external status page webhook.
- **App SDK.** The Ops Dashboard is a custom Studio tool built with
  `@sanity/sdk-react`. One GROQ query gives live mean time to resolution,
  open incidents by severity and pending approvals. It started read-only,
  which felt like decoration, so it can now approve escalations too, using
  the *same* Server Action as the app. There's no second, weaker path.
- **AI inside the content workflow.** Resolving an incident sends the
  frozen timeline to Groq (`openai/gpt-oss-120b`) for a root cause and up
  to three action items, told to say "unknown" instead of guessing. A
  custom Studio input (`RootCauseInput.tsx`) adds a "Regenerate with AI"
  button, so an editor can ask for another draft at any time.

## Sanity Project Details

- **Project ID:** `am9ihg1w`
- **Dataset:** `production`

Schema types: `incident`, `timelineEvent`, `responder`,
`escalationApproval`, `statusPageEntry`, `postmortem`, `runbook`.

Two modeling decisions I'd defend:

1. **Timeline events are their own documents, not an array on the
   incident.** An array means every responder posting at once edits the
   same document. As separate `timelineEvent` documents that reference the
   incident, two posts in the same second never conflict, and the app
   subscribes to them with `listen()` filtered by `incident._ref`.
2. **Postmortems copy the timeline instead of referencing it.** On
   resolution, every event is copied into `postmortem.timelineSnapshot` as
   plain objects, so later edits to the live timeline can't quietly change
   what the postmortem says happened.

## Agent Session

<!-- Upload the Claude Code transcript at https://dev.to/agent_sessions/new, remove anything sensitive (API keys, tokens), click Make Public, and paste the embed here. -->

<sub>Demo video music: "Wallpaper" by Kevin MacLeod (incompetech.com), licensed under [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/).</sub>
