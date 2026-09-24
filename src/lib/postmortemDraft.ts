// Drafts a postmortem root cause + action items from a resolved incident's
// frozen timeline, using an LLM (Groq's hosted `openai/gpt-oss-120b`). This
// is the "an agent moves a draft forward" piece of the workflow: resolving
// an incident doesn't just freeze the timeline, it also has an AI actor
// write a first-pass postmortem for a human to edit. Off by default (no
// GROQ_API_KEY means no call, same opt-in pattern as the status page
// webhook) and never throws — a flaky/unconfigured LLM call must not block
// incident resolution or a manual regenerate request.
export type TimelineEventForDraft = {
  eventType: string;
  body: string;
  createdAt: string;
  authorName?: string | null;
};

export type PostmortemDraft = {
  rootCause: string;
  actionItems: string[];
};

const GROQ_MODEL = "openai/gpt-oss-120b";

export async function draftPostmortem(
  incidentTitle: string,
  events: TimelineEventForDraft[],
): Promise<PostmortemDraft | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || events.length === 0) return null;

  const timelineText = events
    .map(
      (event) =>
        `[${event.createdAt}] (${event.eventType}${event.authorName ? `, ${event.authorName}` : ""}) ${event.body}`,
    )
    .join("\n");

  const prompt = `You are drafting an incident postmortem for: "${incidentTitle}".

Timeline of events, oldest first:
${timelineText}

Write:
1. A concise root cause paragraph (2-4 sentences), grounded only in the timeline above. If the timeline doesn't clearly state a root cause, say plainly what remains unknown instead of guessing.
2. Up to 3 short, concrete follow-up action items.

Respond with ONLY a JSON object of the exact shape: {"rootCause": string, "actionItems": string[]}`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        }),
      },
    );

    if (!response.ok) {
      console.error(
        "draftPostmortem: Groq API error",
        response.status,
        await response.text(),
      );
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;

    const parsed = JSON.parse(content);
    if (
      typeof parsed.rootCause !== "string" ||
      !Array.isArray(parsed.actionItems)
    ) {
      return null;
    }

    return {
      rootCause: parsed.rootCause,
      actionItems: parsed.actionItems
        .filter((item: unknown): item is string => typeof item === "string")
        .slice(0, 3),
    };
  } catch (error) {
    console.error("draftPostmortem: failed", error);
    return null;
  }
}
