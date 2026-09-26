"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { client, writeClient } from "@/sanity/lib/client";
import { notifyStatusPageWebhook } from "@/lib/statusPageWebhook";
import { draftPostmortem } from "@/lib/postmortemDraft";
import { getCurrentResponderId } from "@/lib/auth";

/**
 * Raises an incident to SEV1 by opening an escalationApproval request.
 * This does NOT change the incident's severity directly — per
 * docs/architecture.md, raising severity to SEV1 creates a pending
 * approval that needs sign-off from two on-call leads. The real
 * pending -> approved gate (and the statusPageEntry it triggers) is meant
 * to be enforced by a Sanity Workflow on escalationApproval; this action
 * only creates the request document.
 */
export async function raiseToSev1(incidentId: string) {
  if (!incidentId) return;

  // One open request per incident: a double-click or a second responder
  // hitting the button shouldn't start a parallel approval.
  const existing = await client.fetch<string | null>(
    `*[_type == "escalationApproval" && incident._ref == $incidentId && status == "pending"][0]._id`,
    { incidentId },
  );
  if (existing) return;

  await writeClient.create({
    _type: "escalationApproval",
    incident: { _type: "reference", _ref: incidentId },
    requestedSeverity: "SEV1",
    requiredApprovals: 2,
    approvals: [],
    status: "pending",
  });

  revalidatePath(`/incidents/${incidentId}`);
}

/**
 * Records one approval on a pending escalationApproval — the real
 * pending -> approved gate for the Sanity Workflow modeled on this
 * document type (see sanity.config.ts and docs/schema.md). Once
 * `approvals.length >= requiredApprovals`, this is also the only code
 * path allowed to complete the transition's side effects: flip the
 * incident's severity/status, create the resulting `statusPageEntry`, and
 * notify an external status page webhook if one's configured. Called from
 * both the incident detail page and the App SDK Ops Dashboard tool — same
 * gate either way, no separate/weaker write path for the dashboard.
 */
export async function approveEscalation(formData: FormData) {
  const approvalId = formData.get("approvalId");
  const incidentId = formData.get("incidentId");

  if (
    typeof approvalId !== "string" ||
    typeof incidentId !== "string" ||
    !approvalId
  ) {
    return;
  }

  // The approver is whoever is logged in, never a value from the form, so
  // one lead can't sign off on behalf of the other.
  const responderId = await getCurrentResponderId();
  if (!responderId) return;

  const [current, approver] = await Promise.all([
    client.fetch<{
      _rev: string;
      approvals?: Array<{ approver?: { _ref?: string } }>;
      requiredApprovals?: number;
      requestedSeverity?: string;
      status?: string;
    } | null>(
      `*[_id == $approvalId][0]{_rev, approvals, requiredApprovals, requestedSeverity, status}`,
      { approvalId },
    ),
    client.fetch<{ role?: string } | null>(`*[_id == $responderId][0]{role}`, {
      responderId,
    }),
  ]);

  if (!current || current.status !== "pending") return;
  if (approver?.role !== "on-call-lead") return;
  if (current.approvals?.some((a) => a.approver?._ref === responderId)) return;

  // ifRevisionId makes this fail if another approval landed since the read
  // above, so two leads approving at the same moment can't both count as
  // "the first" and skip the escalation.
  await writeClient
    .patch(approvalId)
    .ifRevisionId(current._rev)
    .setIfMissing({ approvals: [] })
    .append("approvals", [
      {
        _key: randomUUID(),
        approver: { _type: "reference", _ref: responderId },
        approvedAt: new Date().toISOString(),
      },
    ])
    .commit();

  const newApprovalCount = (current.approvals?.length ?? 0) + 1;
  const requiredApprovals = current.requiredApprovals ?? 2;

  if (newApprovalCount >= requiredApprovals) {
    await writeClient.patch(approvalId).set({ status: "approved" }).commit();

    const incident = await client.fetch<{ title?: string } | null>(
      `*[_id == $incidentId][0]{title}`,
      { incidentId },
    );

    const severity = current.requestedSeverity ?? "SEV1";
    const summary = `${incident?.title ?? "An incident"} has been escalated to ${severity}.`;

    await writeClient
      .patch(incidentId)
      .set({ status: "escalated", severity })
      .commit();

    const approverNames = await client.fetch<string[]>(
      `*[_id == $approvalId][0].approvals[].approver->name`,
      { approvalId },
    );

    await writeClient.create({
      _type: "timelineEvent",
      incident: { _type: "reference", _ref: incidentId },
      eventType: "severityChange",
      body: `Escalated to ${severity}, approved by ${approverNames.join(" and ")}.`,
      createdAt: new Date().toISOString(),
    });

    await writeClient.create({
      _type: "statusPageEntry",
      incident: { _type: "reference", _ref: incidentId },
      publicSummary: summary,
      publishedAt: new Date().toISOString(),
    });

    await notifyStatusPageWebhook({
      incidentId,
      incidentTitle: incident?.title ?? "Unknown incident",
      severity,
      summary,
    });
  }

  revalidatePath(`/incidents/${incidentId}`);
}

/**
 * Resolves an incident: freezes every timelineEvent into a new postmortem
 * document's `timelineSnapshot` (plain copied objects, not references — see
 * docs/schema.md), then flips the incident to "resolved". Runs the
 * snapshot copy and the status flip as two separate writes, but guards on
 * the incident not already being resolved so this can't run twice and
 * create duplicate postmortems. Also asks an LLM (see
 * src/lib/postmortemDraft.ts) to draft a first-pass root cause and action
 * items from that same timeline — a human still reviews/edits it in the
 * Studio, but resolving an incident no longer leaves the postmortem
 * completely blank.
 */
export async function resolveIncident(incidentId: string) {
  if (!incidentId) return;

  const incident = await client.fetch<{ title?: string; status?: string } | null>(
    `*[_id == $incidentId][0]{title, status}`,
    { incidentId },
  );

  if (!incident || incident.status === "resolved") return;

  // Log the resolution itself first, so it's part of the frozen snapshot
  // and the postmortem draft sees when the incident ended.
  const resolverId = await getCurrentResponderId();
  await writeClient.create({
    _type: "timelineEvent",
    incident: { _type: "reference", _ref: incidentId },
    ...(resolverId ? { author: { _type: "reference", _ref: resolverId } } : {}),
    eventType: "statusChange",
    body: "Marked resolved.",
    createdAt: new Date().toISOString(),
  });

  const timelineEvents = await client.fetch<
    Array<{
      eventType: string;
      body: string;
      createdAt: string;
      author?: { name: string } | null;
    }>
  >(
    `*[_type == "timelineEvent" && incident._ref == $incidentId] | order(createdAt asc){
      eventType, body, createdAt, author->{name}
    }`,
    { incidentId },
  );

  const draft = await draftPostmortem(
    incident.title ?? "Untitled incident",
    timelineEvents.map((event) => ({
      eventType: event.eventType,
      body: event.body,
      createdAt: event.createdAt,
      authorName: event.author?.name,
    })),
  );

  await writeClient.create({
    _type: "postmortem",
    incident: { _type: "reference", _ref: incidentId },
    timelineSnapshot: timelineEvents.map((event) => ({
      _key: randomUUID(),
      _type: "timelineSnapshotEntry",
      eventType: event.eventType,
      body: event.body,
      createdAt: event.createdAt,
      ...(event.author?.name ? { authorName: event.author.name } : {}),
    })),
    rootCause: draft?.rootCause ?? "",
    actionItems: draft?.actionItems ?? [],
  });

  await writeClient
    .patch(incidentId)
    .set({ status: "resolved", resolvedAt: new Date().toISOString() })
    .commit();

  revalidatePath(`/incidents/${incidentId}`);
}

/**
 * Creates a new timelineEvent document. The author picker defaults to the
 * logged-in responder but can be changed, e.g. to log something a
 * teammate said on the bridge call.
 */
export async function postTimelineEvent(formData: FormData) {
  const incidentId = formData.get("incidentId");
  const authorId = formData.get("authorId");
  const body = formData.get("body");
  const eventType = formData.get("eventType");

  if (
    typeof incidentId !== "string" ||
    !incidentId ||
    typeof body !== "string" ||
    !body.trim()
  ) {
    return;
  }

  await writeClient.create({
    _type: "timelineEvent",
    incident: { _type: "reference", _ref: incidentId },
    ...(typeof authorId === "string" && authorId
      ? { author: { _type: "reference", _ref: authorId } }
      : {}),
    eventType: typeof eventType === "string" && eventType ? eventType : "update",
    body: body.trim(),
    createdAt: new Date().toISOString(),
  });

  revalidatePath(`/incidents/${incidentId}`);
}
