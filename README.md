# Incident War Room

A real-time incident-management app built for the dev.to × Sanity "Path Two"
hackathon (2026-09-16). Next.js 16 (App Router) on the front end, Sanity as
the content backend, using **Sanity Workflows** and the **Sanity App SDK**
as functional features rather than decorative ones.

## What it does

- **Incident timeline** — live-updating via Sanity's `listen()` API, no polling.
- **SEV1 escalation gate** — raising an incident to SEV1 opens an
  `escalationApproval` request that needs sign-off from **2** on-call leads
  before the severity actually changes. The count check is enforced
  server-side in a Next.js Server Action
  (`src/app/incidents/[id]/actions.ts`), not just hidden in the UI.
- **Sanity Workflow** — the `escalationApproval` document type is tracked
  through `pending → approved/rejected` as a Kanban board in Studio via
  `sanity-plugin-workflow`. This plugin's own transitions are Studio-side
  only (its README says so directly) — the real enforcement is the Server
  Action above. Both exist on purpose, for different jobs.
- **Postmortem generation** — resolving an incident copies every
  `timelineEvent` into a frozen `postmortem.timelineSnapshot` (plain
  objects, not references), so later edits to live timeline events can't
  rewrite history.
- **Ops Dashboard** — a custom Studio tool built with `@sanity/sdk-react`
  (the Sanity App SDK) showing cross-incident MTTR, open incidents by
  severity, and pending approvals, computed live from the dataset.
- **App-level auth** — simple seeded test credentials and an HMAC-signed
  session cookie, gating `/incidents/*` via `src/proxy.ts`. This is not
  Sanity Studio's own login; the Studio at `/studio` uses Sanity's auth.

See `docs/` for the original planning docs (`overview.md`,
`architecture.md`, `schema.md`, `why-it-wins.md`) written before the build.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, TypeScript, `src/` layout)
- [Sanity](https://www.sanity.io) — schema, GROQ, real-time `listen()`, embedded Studio
- [`sanity-plugin-workflow`](https://github.com/sanity-io/sanity-plugin-workflow) — Kanban state tracking
- [`@sanity/sdk` / `@sanity/sdk-react`](https://www.sanity.io/docs/app-sdk) — the App SDK, powering the Ops Dashboard tool
- Tailwind CSS v4
- [pnpm](https://pnpm.io) as the package manager

## Getting started

```bash
pnpm install
cp .env.local.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project dashboard (already set to this project's ID) |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | any recent date, e.g. `2026-09-24` |
| `SANITY_API_WRITE_TOKEN` | Sanity project → API → Tokens, needs Editor access |
| `AUTH_SECRET` | any random 32-byte hex string, e.g. `openssl rand -hex 32` |

Seed the dataset with demo responders and one sample incident:

```bash
pnpm seed
```

Run the app:

```bash
pnpm dev
```

- App: [http://localhost:3000](http://localhost:3000) (redirects to `/incidents`, login required)
- Studio: [http://localhost:3000/studio](http://localhost:3000/studio)

Login credentials for the demo are seeded, plaintext, and listed in
`docs/testing-credentials.md` — this is a hackathon demo, not a real auth
system.

## Scripts

- `pnpm dev` — start the dev server
- `pnpm build` — production build
- `pnpm seed` — seed responders + a sample incident into the configured dataset
- `pnpm lint` — ESLint
