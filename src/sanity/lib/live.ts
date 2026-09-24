import type { MutationEvent } from "next-sanity";

import { client } from "./client";

/**
 * Real-time subscription for a single incident's timeline.
 *
 * Frontend contract (see docs/architecture.md): the incident detail view
 * subscribes to Sanity's `listen()` API on `timelineEvent`, filtered by
 * `incident._ref`, so every open viewer sees new events the instant they're
 * created — no polling, no refresh.
 *
 * This wraps `client.listen()` in a plain callback so a later agent can wire
 * it into a React hook (e.g. `useEffect(() => subscribeToTimeline(id, cb), [id])`)
 * without needing to know about the underlying Observable API.
 *
 * @param incidentId - `_id` of the `incident` document to watch.
 * @param onEvent - called with each mutation event (create/update/delete) on
 *   a `timelineEvent` document that references this incident.
 * @returns an `unsubscribe` function — call it on cleanup (e.g. a React
 *   effect's return value) to close the subscription.
 */
export function subscribeToTimeline(
  incidentId: string,
  onEvent: (event: MutationEvent) => void,
): () => void {
  const query = `*[_type == "timelineEvent" && incident._ref == $incidentId]`;

  const subscription = client
    .listen(query, { incidentId })
    .subscribe((event) => {
      onEvent(event);
    });

  return () => subscription.unsubscribe();
}
