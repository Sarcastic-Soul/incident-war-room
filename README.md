# Incident War Room

A real-time incident-management app built for the dev.to × Sanity
["Path Two" hackathon](https://dev.to/challenges/sanity-2026-09-16). Next.js
16 on the front end, Sanity as the backend — using **Sanity Workflows** and
the **Sanity App SDK** for real functionality, not as checkbox features.

**Live demo:** https://incident-war-room-nine.vercel.app
**Sanity project:** `am9ihg1w` / dataset `production`
**Login:** seeded test accounts in [`docs/testing-credentials.md`](docs/testing-credentials.md)

## What it does

- **Live incident timeline** — updates via Sanity's `listen()` API, no polling.
- **SEV1 escalation gate** — raising an incident to SEV1 opens an
  `escalationApproval` request needing sign-off from **two** on-call leads
  before severity actually changes. Enforced server-side
  (`src/app/incidents/[id]/actions.ts`), not just hidden in the UI.
- **Sanity Workflow** — `escalationApproval` is tracked `pending → approved/rejected`
  as a Kanban board in Studio (`sanity-plugin-workflow`). Once approved, the
  same code path flips the incident to `escalated`, publishes a
  `statusPageEntry`, and can notify an external status-page webhook.
- **AI-drafted postmortems** — resolving an incident freezes the timeline into
  a `postmortem` document and asks an LLM (Groq's `openai/gpt-oss-120b`) to
  draft a root cause and action items from it. A custom Studio input
  (`src/sanity/components/RootCauseInput.tsx`) adds a "Regenerate with AI"
  button so an editor can ask for another pass any time.
- **Ops Dashboard** — a custom Studio tool built with `@sanity/sdk-react`
  (the App SDK): live cross-incident MTTR, open incidents by severity, and a
  panel to approve pending escalations directly — reusing the same
  server-enforced gate as the incident page, not a separate write path.
- **Related runbooks** — the incident page pulls in any `runbook` document
  tagged for that severity (or explicitly linked to the incident) and renders
  its steps inline, so a responder doesn't have to leave the page.
- **Dark mode + Studio shortcut** in the app header; login form is pre-filled
  with demo credentials for judges.

See [`docs/`](docs/) for the schema (`schema.md`), architecture
(`architecture.md`), and the original planning docs written before the build.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, TypeScript, `src/` layout)
- [Sanity](https://www.sanity.io) — schema, GROQ, real-time `listen()`, embedded Studio
- [`sanity-plugin-workflow`](https://github.com/sanity-io/sanity-plugin-workflow) — Kanban state tracking
- [`@sanity/sdk` / `@sanity/sdk-react`](https://www.sanity.io/docs/app-sdk) — the App SDK, powering the Ops Dashboard tool
- [Groq](https://groq.com) (`openai/gpt-oss-120b`) — postmortem drafting
- Tailwind CSS v4, [Heroicons](https://heroicons.com)
- [pnpm](https://pnpm.io)

## Getting started

```bash
pnpm install
cp .env.local.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project dashboard (defaults to this project) |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | any recent date, e.g. `2026-09-24` |
| `SANITY_API_WRITE_TOKEN` | Sanity project → API → Tokens, needs Editor access |
| `AUTH_SECRET` | any random 32-byte hex string, e.g. `openssl rand -hex 32` |
| `GROQ_API_KEY` | optional — free key at [console.groq.com](https://console.groq.com/keys); without it, postmortems are just created blank |
| `STATUS_PAGE_WEBHOOK_URL` | optional — POSTed on SEV1 approval; unset = no-op |

```bash
pnpm seed   # demo responders + one sample incident
pnpm dev
```

- App: [http://localhost:3000](http://localhost:3000) (redirects to `/incidents`, login required)
- Studio: [http://localhost:3000/studio](http://localhost:3000/studio)

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm seed` — seed responders + a sample incident
- `pnpm lint` — ESLint
