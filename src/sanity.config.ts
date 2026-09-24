import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { workflow } from "sanity-plugin-workflow";

import { apiVersion, dataset, projectId } from "./sanity/env";
import { schemaTypes } from "./sanity/schemaTypes";
import { opsDashboardTool } from "./sanity/tools/opsDashboard";

export default defineConfig({
  name: "incident-war-room",
  title: "Incident War Room",

  basePath: "/studio",

  projectId,
  dataset,

  schema: {
    types: schemaTypes,
  },

  plugins: [
    structureTool(),
    visionTool({ defaultApiVersion: apiVersion }),
    // Tracks each escalationApproval through pending -> approved/rejected as
    // a visual Kanban board + document actions in Studio. This plugin's own
    // transitions are enforced client-side only (see its README); the actual
    // approval-count gate (2 approvers required for SEV1) is enforced
    // server-side in the Next.js app's `approveEscalation` server action
    // (src/app/incidents/[id]/actions.ts), which is the only code path
    // allowed to flip an escalationApproval to "approved".
    workflow({
      schemaTypes: ["escalationApproval"],
      states: [
        {
          id: "pending",
          title: "Pending approval",
          color: "warning",
          transitions: ["approved", "rejected"],
        },
        {
          id: "approved",
          title: "Approved",
          color: "success",
          transitions: [],
        },
        {
          id: "rejected",
          title: "Rejected",
          color: "danger",
          transitions: [],
        },
      ],
    }),
  ],

  tools: (prev) => [...prev, opsDashboardTool],
});
