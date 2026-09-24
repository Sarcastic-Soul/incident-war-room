import { NextResponse } from "next/server";
import { client, writeClient } from "@/sanity/lib/client";
import { draftPostmortem } from "@/lib/postmortemDraft";

/**
 * Backs the "Regenerate with AI" button in the Studio's custom root-cause
 * input (src/sanity/components/RootCauseInput.tsx). The Studio runs
 * entirely client-side, so it can't hold GROQ_API_KEY or call writeClient
 * itself — this route is the server-side boundary that does both, using
 * the same draftPostmortem() helper the automatic on-resolve draft uses.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const postmortemId = body?.postmortemId;

  if (typeof postmortemId !== "string" || !postmortemId) {
    return NextResponse.json(
      { ok: false, reason: "missing_postmortem_id" },
      { status: 400 },
    );
  }

  const postmortem = await client.fetch<{
    incidentTitle?: string;
    timelineSnapshot?: Array<{
      eventType: string;
      body: string;
      createdAt: string;
      authorName?: string | null;
    }>;
  } | null>(
    `*[_id == $postmortemId][0]{
      "incidentTitle": incident->title,
      timelineSnapshot[]{eventType, body, createdAt, authorName}
    }`,
    { postmortemId },
  );

  if (!postmortem) {
    return NextResponse.json(
      { ok: false, reason: "not_found" },
      { status: 404 },
    );
  }

  const draft = await draftPostmortem(
    postmortem.incidentTitle ?? "Untitled incident",
    postmortem.timelineSnapshot ?? [],
  );

  if (!draft) {
    return NextResponse.json({ ok: false, reason: "draft_unavailable" });
  }

  await writeClient
    .patch(postmortemId)
    .set({ rootCause: draft.rootCause, actionItems: draft.actionItems })
    .commit();

  return NextResponse.json({ ok: true, ...draft });
}
