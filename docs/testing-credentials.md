# Testing credentials

Incident War Room uses a small hardcoded list of seeded fake responders for
login — no real accounts, no OAuth, no sign-up. Use any of the following to
log in at `/login`:

| Email | Password | Responder | Role |
| --- | --- | --- | --- |
| alice@example.com | demo1234 | Alice Nakamura | on-call-lead |
| bob@example.com | demo1234 | Bob Delgado | engineer |
| carol@example.com | demo1234 | Carol Okafor | comms |
| dana@example.com | demo1234 | Dana Whitfield | on-call-lead |

There are two on-call-leads (Alice, Dana) on purpose — the SEV1 escalation
gate needs sign-off from **two distinct** on-call leads, so you need both
accounts to see it go through end to end.

To see the gate: log in as Alice, open an incident, click **Raise to SEV1**
and approve. It stays at 1 / 2. Log out (top right), log in as Dana, and
approve again; the incident flips to SEV1 / escalated and a status page
entry appears. Bob and Carol can't approve at all.

These responders, three sample incidents and two runbooks are created by
`pnpm seed` (`scripts/seed.ts`). Re-running it resets the sample incidents
to a clean state.
