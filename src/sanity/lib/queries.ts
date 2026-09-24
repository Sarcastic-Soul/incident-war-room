import { defineQuery } from "next-sanity";

/**
 * All incidents, most recently opened first.
 * Usable from a Next.js server component (`client.fetch(allIncidentsQuery)`)
 * or from a Studio custom tool.
 */
export const allIncidentsQuery = defineQuery(`
  *[_type == "incident"] | order(openedAt desc) {
    _id,
    title,
    severity,
    status,
    openedAt,
    resolvedAt,
    owner->{
      _id,
      name,
      role,
      onCallTeam
    }
  }
`);

/**
 * A single incident by `_id`, with its owner dereferenced.
 */
export const incidentByIdQuery = defineQuery(`
  *[_type == "incident" && _id == $id][0] {
    _id,
    title,
    severity,
    status,
    openedAt,
    resolvedAt,
    owner->{
      _id,
      name,
      role,
      onCallTeam
    }
  }
`);

/**
 * timelineEvent documents for a given incident, oldest first — this is the
 * order a timeline should render in.
 */
export const timelineEventsForIncidentQuery = defineQuery(`
  *[_type == "timelineEvent" && incident._ref == $incidentId] | order(createdAt asc) {
    _id,
    eventType,
    body,
    createdAt,
    author->{
      _id,
      name,
      role,
      onCallTeam
    }
  }
`);

/**
 * Pending escalationApproval documents for a given incident, with each
 * approval's approver dereferenced.
 */
export const pendingEscalationApprovalsForIncidentQuery = defineQuery(`
  *[
    _type == "escalationApproval" &&
    incident._ref == $incidentId &&
    status == "pending"
  ] {
    _id,
    requestedSeverity,
    requiredApprovals,
    status,
    approvals[] {
      approvedAt,
      approver->{
        _id,
        name,
        role,
        onCallTeam
      }
    }
  }
`);

/**
 * All responders.
 */
export const allRespondersQuery = defineQuery(`
  *[_type == "responder"] | order(name asc) {
    _id,
    name,
    role,
    onCallTeam
  }
`);

/**
 * Cross-incident aggregations for the future App SDK "Ops Dashboard" custom
 * Studio tool:
 *  - mttrSeconds: mean time to resolution across resolved incidents
 *    (avg of resolvedAt - openedAt, in seconds)
 *  - openBySeverity: count of currently-open (non-resolved) incidents,
 *    broken down by severity
 *  - pendingApprovalsCount: count of escalationApproval docs still pending
 *
 * A single query object keeps this usable from both a Next.js server
 * component and a Studio custom tool without duplicating the aggregation
 * logic in two places.
 */
export const opsDashboardQuery = defineQuery(`
  {
    "mttrSeconds": math::avg(
      *[_type == "incident" && defined(openedAt) && defined(resolvedAt)] {
        "durationSeconds": dateTime(resolvedAt) - dateTime(openedAt)
      }.durationSeconds
    ),
    "openBySeverity": {
      "SEV1": count(*[_type == "incident" && status != "resolved" && severity == "SEV1"]),
      "SEV2": count(*[_type == "incident" && status != "resolved" && severity == "SEV2"]),
      "SEV3": count(*[_type == "incident" && status != "resolved" && severity == "SEV3"]),
      "SEV4": count(*[_type == "incident" && status != "resolved" && severity == "SEV4"])
    },
    "pendingApprovalsCount": count(*[_type == "escalationApproval" && status == "pending"]),
    "pendingApprovals": *[_type == "escalationApproval" && status == "pending"] | order(_createdAt asc) {
      _id,
      requestedSeverity,
      requiredApprovals,
      "approvedCount": count(approvals),
      incident->{_id, title}
    },
    "onCallLeads": *[_type == "responder" && role == "on-call-lead"] | order(name asc) {
      _id,
      name
    }
  }
`);
