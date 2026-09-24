"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { client, writeClient } from "@/sanity/lib/client";
import { notifyStatusPageWebhook } from "@/lib/statusPageWebhook";
import { draftPostmortem } from "@/lib/postmortemDraft";

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
  const responderId = formData.get("responderId");
  const incidentId = formData.get("incidentId");

  if (
    typeof approvalId !== "string" ||
    typeof responderId !== "string" ||
    typeof incidentId !== "string" ||
    !approvalId ||
    !responderId
  ) {
    return;
  }

  const current = await client.fetch<{
    approvals?: unknown[];
    requiredApprovals?: number;
    requestedSeverity?: string;
    status?: string;
  } | null>(
    `*[_id == $approvalId][0]{approvals, requiredApprovals, requestedSeverity, status}`,
    { approvalId },
  );

  if (!current || current.status !== "pending") {
    return;
  }

  await writeClient
    .patch(approvalId)
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
 * Creates a new timelineEvent document. Kept intentionally minimal: the
 * author is a plain responder picker for now (auth-derived authorship
 * will be wired in by the auth agent later).
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
