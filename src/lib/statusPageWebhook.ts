// Fires when an escalationApproval's `approved` transition lands — the one
// workflow step docs/architecture.md calls out as allowed to reach outside
// the dataset. Off by default (no STATUS_PAGE_WEBHOOK_URL configured means
// no call), so plugging in a real endpoint (Slack incoming webhook, a
// status-page provider, anything HTTPS) is opt-in rather than a hardcoded
// third-party URL baked into the app. Never throws: a flaky external
// status page must not block the approval transition it's reacting to.
export async function notifyStatusPageWebhook(payload: {
  incidentId: string;
  incidentTitle: string;
  severity: string;
  summary: string;
}) {
  const url = process.env.STATUS_PAGE_WEBHOOK_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "incident.escalated",
        timestamp: new Date().toISOString(),
        ...payload,
      }),
    });
  } catch (error) {
    console.error(
      "notifyStatusPageWebhook: external status page call failed",
      error,
    );
  }
}
