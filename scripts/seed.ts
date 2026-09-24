/**
 * Standalone seed script — run with `pnpm seed`.
 *
 * Creates the fake responders and one starter incident that the
 * hardcoded test-credential auth (src/lib/auth.ts) and the demo app rely
 * on. Uses deterministic `_id`s with `createOrReplace` so re-running this
 * script is always safe.
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
];

const seedIncident = {
  _id: "incident-seed-1",
  _type: "incident",
  title: "API latency spike on checkout service",
  severity: "SEV3" as const,
  status: "investigating" as const,
  owner: {
    _type: "reference" as const,
    _ref: "responder-alice",
  },
  openedAt: new Date().toISOString(),
};

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

  console.log("Seeding incident...");
  await writeClient.createOrReplace(seedIncident);
  console.log(`  - ${seedIncident._id} (${seedIncident.severity}, ${seedIncident.status})`);

  console.log("Seed complete.");
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
