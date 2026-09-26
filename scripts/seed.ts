/**
 * Standalone seed script — run with `pnpm seed`.
 *
 * Creates the fake responders that the hardcoded test-credential auth
 * (src/lib/auth.ts) relies on, plus a few sample incidents with timeline
 * events and two runbooks for the demo. Uses deterministic `_id`s with
 * `createOrReplace`, and clears approvals/postmortems left on the sample
 * incidents, so re-running this script always gives the same clean state.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const envLocalPath = path.join(projectRoot, ".env.local");
if (existsSync(envLocalPath)) {
  process.loadEnvFile(envLocalPath);
}

type ResponderSeed = {
  _id: string;
  _type: "responder";
  name: string;
  role: "on-call-lead" | "engineer" | "comms";
  onCallTeam: string;
};

const responders: ResponderSeed[] = [
  {
    _id: "responder-alice",
    _type: "responder",
    name: "Alice Nakamura",
    role: "on-call-lead",
    onCallTeam: "Platform",
  },
  {
    _id: "responder-bob",
    _type: "responder",
    name: "Bob Delgado",
    role: "engineer",
    onCallTeam: "Platform",
  },
  {
    _id: "responder-carol",
    _type: "responder",
    name: "Carol Okafor",
    role: "comms",
    onCallTeam: "Comms",
  },
  {
    _id: "responder-dana",
    _type: "responder",
    name: "Dana Whitfield",
    role: "on-call-lead",
    onCallTeam: "Platform",
  },
];

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const now = Date.now();
const ago = (ms: number) => new Date(now - ms).toISOString();
const ref = (id: string) => ({ _type: "reference" as const, _ref: id });

type Severity = "SEV1" | "SEV2" | "SEV3" | "SEV4";
type Status = "investigating" | "mitigated" | "resolved" | "escalated";

type IncidentSeed = {
  _id: string;
  _type: "incident";
  title: string;
  severity: Severity;
  status: Status;
  owner: ReturnType<typeof ref>;
  openedAt: string;
  resolvedAt?: string;
};

// A few incidents in different states so the list, the Ops Dashboard's
// open-by-severity tiles and its MTTR tile all have something to show.
const incidents: IncidentSeed[] = [
  {
    _id: "incident-seed-1",
    _type: "incident",
    title: "API latency spike on checkout service",
    severity: "SEV3",
    status: "investigating",
    owner: ref("responder-alice"),
    openedAt: ago(25 * MINUTE),
  },
  {
    _id: "incident-seed-2",
    _type: "incident",
    title: "Search results missing for new products",
    severity: "SEV2",
    status: "mitigated",
    owner: ref("responder-dana"),
    openedAt: ago(3 * HOUR),
  },
  {
    _id: "incident-seed-3",
    _type: "incident",
    title: "Password reset emails delayed",
    severity: "SEV4",
    status: "resolved",
    owner: ref("responder-bob"),
    openedAt: ago(26 * HOUR),
    resolvedAt: ago(24 * HOUR),
  },
];

const timelineEvents = [
  {
    _id: "timeline-seed-1a",
    incident: "incident-seed-1",
    author: "responder-bob",
    eventType: "update",
    body: "p95 latency on /checkout jumped from 300ms to 4s. Error rate still normal.",
    createdAt: ago(24 * MINUTE),
  },
  {
    _id: "timeline-seed-1b",
    incident: "incident-seed-1",
    author: "responder-alice",
    eventType: "update",
    body: "Started right after the payments-gateway v2.31 deploy.",
    createdAt: ago(18 * MINUTE),
  },
  {
    _id: "timeline-seed-1c",
    incident: "incident-seed-1",
    author: "responder-carol",
    eventType: "update",
    body: "Support is seeing a spike in 'payment stuck' tickets.",
    createdAt: ago(12 * MINUTE),
  },
  {
    _id: "timeline-seed-2a",
    incident: "incident-seed-2",
    author: "responder-dana",
    eventType: "update",
    body: "Indexer queue backed up. Paused the bulk import job.",
    createdAt: ago(2.5 * HOUR),
  },
  {
    _id: "timeline-seed-2b",
    incident: "incident-seed-2",
    author: "responder-dana",
    eventType: "statusChange",
    body: "Queue draining, new products showing up again. Mitigated.",
    createdAt: ago(2 * HOUR),
  },
  {
    _id: "timeline-seed-3a",
    incident: "incident-seed-3",
    author: "responder-bob",
    eventType: "update",
    body: "Email provider rate-limited us after a marketing send. Moved resets to the priority pool.",
    createdAt: ago(25 * HOUR),
  },
].map(({ incident, author, ...event }) => ({
  ...event,
  _type: "timelineEvent" as const,
  incident: ref(incident),
  author: ref(author),
}));

let blockKey = 0;
const block = (text: string, listItem?: "number") => {
  blockKey += 1;
  return {
    _type: "block",
    _key: `step-${blockKey}`,
    style: "normal",
    markDefs: [],
    ...(listItem ? { listItem, level: 1 } : {}),
    children: [{ _type: "span", _key: `span-${blockKey}`, text, marks: [] }],
  };
};

const runbooks = [
  {
    _id: "runbook-sev1-major",
    _type: "runbook",
    title: "SEV1: major customer-facing outage",
    applicableSeverity: ["SEV1"],
    steps: [
      block("Page the second on-call lead and open a bridge call.", "number"),
      block("Post a first status page update within 15 minutes.", "number"),
      block("Freeze all deploys until the incident is mitigated.", "number"),
      block("Assign one person to comms so engineers can focus.", "number"),
    ],
  },
  {
    _id: "runbook-latency",
    _type: "runbook",
    title: "Latency spike after a deploy",
    applicableSeverity: ["SEV2", "SEV3"],
    steps: [
      block("Compare p95 latency before and after the last deploy.", "number"),
      block("If it lines up, roll back first and debug after.", "number"),
      block("Check database connection pool and slow query logs.", "number"),
    ],
  },
];

async function seed() {
  if (!process.env.SANITY_API_WRITE_TOKEN) {
    console.error(
      "Missing SANITY_API_WRITE_TOKEN in .env.local — cannot seed. " +
        "Create a token with Editor/Write permissions in the Sanity dashboard " +
        "(API settings) and add it to .env.local, then re-run `pnpm seed`.",
    );
    process.exitCode = 1;
    return;
  }

  const { writeClient } = await import("../src/sanity/lib/client");

  console.log("Seeding responders...");
  for (const responder of responders) {
    await writeClient.createOrReplace(responder);
    console.log(`  - ${responder._id} (${responder.role})`);
  }

  // Clear anything a previous demo run hung off the seeded incidents
  // (approvals, postmortems, status page entries, extra timeline posts), so
  // re-seeding puts them back to a clean starting state.
  const incidentIds = incidents.map((incident) => incident._id);
  const stale = await writeClient.fetch<string[]>(
    `*[_type in ["escalationApproval", "postmortem", "statusPageEntry", "timelineEvent"] && incident._ref in $incidentIds]._id`,
    { incidentIds },
  );
  if (stale.length > 0) {
    const tx = writeClient.transaction();
    for (const id of stale) tx.delete(id);
    await tx.commit();
    console.log(`Cleared ${stale.length} old approvals/postmortems/events.`);
  }

  console.log("Seeding incidents...");
  for (const incident of incidents) {
    await writeClient.createOrReplace(incident);
    console.log(`  - ${incident._id} (${incident.severity}, ${incident.status})`);
  }

  console.log("Seeding timeline events...");
  for (const event of timelineEvents) {
    await writeClient.createOrReplace(event);
  }
  console.log(`  - ${timelineEvents.length} events`);

  console.log("Seeding runbooks...");
  for (const runbook of runbooks) {
    await writeClient.createOrReplace(runbook);
    console.log(`  - ${runbook._id}`);
  }

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
