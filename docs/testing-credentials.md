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

These responders (and one starter incident) are created by `pnpm seed`
(`scripts/seed.ts`), which is safe to re-run at any time.
