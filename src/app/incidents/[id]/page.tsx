import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { PortableText, type PortableTextBlock } from "@portabletext/react";
import { client } from "@/sanity/lib/client";
import { runbooksForIncidentQuery } from "@/sanity/lib/queries";
import { formatDateTime, severityBadgeClass, statusBadgeClass } from "../badge-utils";
import type {
  EscalationApproval,
  IncidentDetail,
  Responder,
  TimelineEvent,
} from "../types";
import { approveEscalation, raiseToSev1, resolveIncident } from "./actions";
import TimelineRealtime from "./TimelineRealtime";

export const dynamic = "force-dynamic";

const INCIDENT_QUERY = `*[_type == "incident" && _id == $id][0]{
  _id, title, severity, status, openedAt, resolvedAt, owner->{_id, name}
}`;

const TIMELINE_QUERY = `*[_type == "timelineEvent" && incident._ref == $id] | order(createdAt asc){
  _id, eventType, body, createdAt, author->{_id, name}
}`;

const PENDING_APPROVAL_QUERY = `*[_type == "escalationApproval" && incident._ref == $id && status == "pending"] | order(_createdAt desc)[0]{
  _id, requestedSeverity, requiredApprovals, status,
  approvals[]{approvedAt, approver->{_id, name}}
}`;

const RESPONDERS_QUERY = `*[_type == "responder"] | order(name asc){_id, name, role}`;

const POSTMORTEM_QUERY = `*[_type == "postmortem" && incident._ref == $id] | order(_createdAt desc)[0]{
  _id, rootCause, actionItems, publishedAt,
  "timelineEntryCount": count(timelineSnapshot)
}`;

type PostmortemSummary = {
  _id: string;
  rootCause?: string | null;
  actionItems?: string[] | null;
  publishedAt?: string | null;
  timelineEntryCount: number;
};

type RunbookSummary = {
  _id: string;
  title: string;
  steps?: PortableTextBlock[] | null;
};

export default async function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [incident, timelineEvents, pendingApproval, responders, postmortem] =
    await Promise.all([
      client.fetch<IncidentDetail | null>(INCIDENT_QUERY, { id }),
      client.fetch<TimelineEvent[]>(TIMELINE_QUERY, { id }),
      client.fetch<EscalationApproval | null>(PENDING_APPROVAL_QUERY, { id }),
      client.fetch<Responder[]>(RESPONDERS_QUERY),
      client.fetch<PostmortemSummary | null>(POSTMORTEM_QUERY, { id }),
    ]);

  if (!incident) {
    notFound();
  }

  const relatedRunbooks = await client.fetch<RunbookSummary[]>(
    runbooksForIncidentQuery,
    { severity: incident.severity, incidentId: id },
  );

  const canRaiseToSev1 =
    incident.severity !== "SEV1" && incident.status !== "resolved";
  const onCallLeads = responders.filter(
    (responder) => responder.role === "on-call-lead",
  );
  const approvedResponderIds = new Set(
    (pendingApproval?.approvals ?? [])
      .map((approval) => approval.approver?._id)
      .filter((value): value is string => Boolean(value)),
  );

  const raiseToSev1WithId = raiseToSev1.bind(null, incident._id);
  const resolveIncidentWithId = resolveIncident.bind(null, incident._id);
  const canResolve = incident.status !== "resolved";

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-10">
      <div>
        <Link
          href="/incidents"
          className="flex items-center gap-1 text-sm text-zinc-500 hover:underline dark:text-zinc-400"
        >
          <ArrowLeftIcon className="size-4" />
          All incidents
        </Link>
      </div>

      <header className="flex flex-col gap-3 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            {incident.title}
          </h1>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClass(incident.severity)}`}
          >
            {incident.severity}
          </span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(incident.status)}`}
          >
            {incident.status}
          </span>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Owner
            </dt>
            <dd>{incident.owner?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Opened
            </dt>
            <dd>{formatDateTime(incident.openedAt)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Resolved
            </dt>
            <dd>{formatDateTime(incident.resolvedAt)}</dd>
          </div>
        </dl>

        <div className="mt-2 flex flex-wrap gap-2">
          {canRaiseToSev1 && (
            <form action={raiseToSev1WithId}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                <ExclamationTriangleIcon className="size-4" />
                Raise to SEV1
              </button>
            </form>
          )}

          {canResolve && (
            <form action={resolveIncidentWithId}>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                <CheckCircleIcon className="size-4" />
                Mark resolved
              </button>
            </form>
          )}
        </div>
      </header>

      {pendingApproval && (
        <section className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Pending escalation to {pendingApproval.requestedSeverity}
            </h2>
            <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
              {(pendingApproval.approvals ?? []).length} /{" "}
              {pendingApproval.requiredApprovals} approvals
            </span>
          </div>

          <ul className="flex flex-col gap-1 text-sm text-amber-900 dark:text-amber-200">
            {(pendingApproval.approvals ?? []).length === 0 ? (
              <li className="text-amber-700 dark:text-amber-400">
                No approvals yet.
              </li>
            ) : (
              (pendingApproval.approvals ?? []).map((approval, index) => (
                <li key={`${approval.approver?._id ?? index}-${approval.approvedAt}`}>
                  {approval.approver?.name ?? "Unknown responder"} —{" "}
                  {formatDateTime(approval.approvedAt)}
                </li>
              ))
            )}
          </ul>

          {onCallLeads.length === 0 ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              No on-call-lead responders found to approve.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {onCallLeads.map((lead) => {
                const alreadyApproved = approvedResponderIds.has(lead._id);
                return (
                  <form key={lead._id} action={approveEscalation}>
                    <input type="hidden" name="approvalId" value={pendingApproval._id} />
                    <input type="hidden" name="incidentId" value={incident._id} />
                    <input type="hidden" name="responderId" value={lead._id} />
                    <button
                      type="submit"
                      disabled={alreadyApproved}
                      className="flex items-center gap-1.5 rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircleIcon className="size-4" />
                      {alreadyApproved ? `${lead.name} approved` : `Approve as ${lead.name}`}
                    </button>
                  </form>
                );
              })}
            </div>
          )}
        </section>
      )}

      {postmortem && (
        <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Postmortem
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {postmortem.timelineEntryCount} timeline{" "}
            {postmortem.timelineEntryCount === 1 ? "entry" : "entries"}{" "}
            frozen at resolution.
          </p>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Root cause
            </dt>
            <dd className="text-sm text-zinc-700 dark:text-zinc-300">
              {postmortem.rootCause || "Not yet documented — edit in the Studio."}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              Action items
            </dt>
            {postmortem.actionItems && postmortem.actionItems.length > 0 ? (
              <ul className="list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                {postmortem.actionItems.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <dd className="text-sm text-zinc-500 dark:text-zinc-500">
                None yet — edit in the Studio.
              </dd>
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Related runbooks
        </h2>
        {relatedRunbooks.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            No runbooks linked for this severity — add one in Studio.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {relatedRunbooks.map((runbook) => (
              <div key={runbook._id}>
                <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {runbook.title}
                </h3>
                {runbook.steps && runbook.steps.length > 0 ? (
                  <div className="mt-1 flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5">
                    <PortableText value={runbook.steps} />
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-500">
                    No steps documented — edit in the Studio.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Timeline</h2>
        <TimelineRealtime
          incidentId={incident._id}
          initialEvents={timelineEvents}
          responders={responders}
        />
      </section>
    </div>
  );
}
