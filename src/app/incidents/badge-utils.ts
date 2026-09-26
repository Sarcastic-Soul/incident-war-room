// Small display helpers shared by the incident list and detail pages.

const SEVERITY_STYLES: Record<string, string> = {
  SEV1: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  SEV2: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  SEV3: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  SEV4: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const STATUS_STYLES: Record<string, string> = {
  investigating: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  mitigated: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  escalated: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const FALLBACK_STYLE =
  "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

export function severityBadgeClass(severity?: string | null): string {
  return SEVERITY_STYLES[severity ?? ""] ?? FALLBACK_STYLE;
}

export function statusBadgeClass(status?: string | null): string {
  return STATUS_STYLES[status ?? ""] ?? FALLBACK_STYLE;
}

// Fixed locale and time zone: this runs both on the server (UTC on Vercel)
// and in the browser (the viewer's zone), and the two must agree, or the
// header and the live timeline on the same page show different clocks.
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${DATE_TIME_FORMAT.format(date)} UTC`;
}
