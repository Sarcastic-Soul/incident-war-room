// Shared shapes for the incidents UI. These mirror the Sanity schema
// described in docs/schema.md but are kept local to src/app/incidents so
// this slice of the app doesn't depend on the schema/queries work another
// agent is doing in parallel.

export type Responder = {
  _id: string;
  name: string;
  role?: string | null;
};

export type IncidentListItem = {
  _id: string;
  title: string;
  severity: string;
  status: string;
  openedAt: string;
  resolvedAt?: string | null;
  owner?: { name: string } | null;
};

export type IncidentDetail = {
  _id: string;
  title: string;
  severity: string;
  status: string;
  openedAt: string;
  resolvedAt?: string | null;
  owner?: { _id: string; name: string } | null;
};

export type TimelineEvent = {
  _id: string;
  eventType: string;
  body: string;
  createdAt: string;
  author?: { _id: string; name: string } | null;
};

export type EscalationApprovalEntry = {
  approvedAt: string;
  approver?: { _id: string; name: string } | null;
};

export type EscalationApproval = {
  _id: string;
  requestedSeverity: string;
  requiredApprovals: number;
  status: string;
  approvals?: EscalationApprovalEntry[];
};
