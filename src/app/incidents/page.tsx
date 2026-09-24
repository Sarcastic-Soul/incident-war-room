import Link from "next/link";
import { client } from "@/sanity/lib/client";
import { formatDateTime, severityBadgeClass, statusBadgeClass } from "./badge-utils";
import type { IncidentListItem } from "./types";

// Always hit Sanity fresh: incidents change constantly during a live
// incident, and the whole point of this page is showing current state.
export const dynamic = "force-dynamic";

const INCIDENTS_QUERY = `*[_type == "incident"] | order(openedAt desc){
  _id, title, severity, status, openedAt, resolvedAt, owner->{name}
}`;

export default async function IncidentsPage() {
  const incidents = await client.fetch<IncidentListItem[]>(INCIDENTS_QUERY);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Incidents</h1>
      </div>

      {incidents.length === 0 ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No incidents yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Owner</th>
                <th className="px-4 py-3 font-medium">Opened</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {incidents.map((incident) => (
                <tr
                  key={incident._id}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/incidents/${incident._id}`}
                      className="font-medium text-zinc-900 hover:underline dark:text-zinc-50"
                    >
                      {incident.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${severityBadgeClass(incident.severity)}`}
                    >
                      {incident.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(incident.status)}`}
                    >
                      {incident.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300">
                    {incident.owner?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatDateTime(incident.openedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
