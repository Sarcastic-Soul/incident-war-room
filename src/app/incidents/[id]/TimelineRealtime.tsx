"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { client } from "@/sanity/lib/client";
import { formatDateTime } from "../badge-utils";
import type { Responder, TimelineEvent } from "../types";
import { postTimelineEvent } from "./actions";

// Filtered to this incident only, per docs/architecture.md: every open
// viewer of an incident should see new timeline events the instant
// they're created, with no polling and no refresh.
const TIMELINE_LISTEN_QUERY = `*[_type == "timelineEvent" && incident._ref == $incidentId]{
  _id, eventType, body, createdAt, author->{_id, name}
}`;

function sortByCreatedAt(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function dedupeById(events: TimelineEvent[]): TimelineEvent[] {
  const byId = new Map<string, TimelineEvent>();
  for (const event of events) {
    byId.set(event._id, event);
  }
  return Array.from(byId.values());
}

export default function TimelineRealtime({
  incidentId,
  initialEvents,
  responders,
}: {
  incidentId: string;
  initialEvents: TimelineEvent[];
  responders: Responder[];
}) {
  const [events, setEvents] = useState<TimelineEvent[]>(() =>
    sortByCreatedAt(initialEvents),
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const subscription = client
      .listen<TimelineEvent>(TIMELINE_LISTEN_QUERY, { incidentId })
      .subscribe((update) => {
        const doc = update.result;
        if (!doc) return;

        setEvents((prev) => sortByCreatedAt(dedupeById([...prev, doc])));
      });

    return () => subscription.unsubscribe();
  }, [incidentId]);

  const sortedEvents = useMemo(() => sortByCreatedAt(events), [events]);

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-3">
        {sortedEvents.length === 0 ? (
          <li className="text-sm text-zinc-500 dark:text-zinc-400">
            No timeline events yet.
          </li>
        ) : (
          sortedEvents.map((event) => (
            <li
              key={event._id}
              className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium uppercase tracking-wide">
                  {event.eventType}
                </span>
                <span>{formatDateTime(event.createdAt)}</span>
              </div>
              <p className="mt-1 text-zinc-800 dark:text-zinc-200">{event.body}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {event.author?.name ?? "Unknown responder"}
              </p>
            </li>
          ))
        )}
      </ol>

      <form
        action={(formData) => {
          startTransition(async () => {
            await postTimelineEvent(formData);
          });
        }}
        className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
      >
        <input type="hidden" name="incidentId" value={incidentId} />
        <div className="flex flex-wrap gap-2">
          <select
            name="authorId"
            defaultValue=""
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Author…</option>
            {responders.map((responder) => (
              <option key={responder._id} value={responder._id}>
                {responder.name}
              </option>
            ))}
          </select>
          <select
            name="eventType"
            defaultValue="update"
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="update">Update</option>
            <option value="statusChange">Status change</option>
            <option value="severityChange">Severity change</option>
          </select>
        </div>
        <textarea
          name="body"
          required
          rows={2}
          placeholder="What's happening?"
          className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={isPending}
          className="self-end rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {isPending ? "Posting…" : "Post update"}
        </button>
      </form>
    </div>
  );
}
