import type { SchemaTypeDefinition } from "sanity";

import { escalationApproval } from "./escalationApproval";
import { incident } from "./incident";
import { postmortem } from "./postmortem";
import { responder } from "./responder";
import { runbook } from "./runbook";
import { statusPageEntry } from "./statusPageEntry";
import { timelineEvent } from "./timelineEvent";

export const schemaTypes: SchemaTypeDefinition[] = [
  responder,
  incident,
  timelineEvent,
  escalationApproval,
  runbook,
  postmortem,
  statusPageEntry,
];
