import { useCallback, useState } from "react";
import { SparklesIcon } from "@sanity/icons/Sparkles";
import { Button, Flex, Stack, Text } from "@sanity/ui";
import { set, useFormValue, type TextInputProps } from "sanity";

/**
 * Custom Studio input for postmortem.rootCause. Wraps the default text
 * input with a "Regenerate with AI" button that calls
 * /api/postmortem/regenerate (see src/app/api/postmortem/regenerate/route.ts),
 * which re-runs the same LLM draft that resolveIncident triggers
 * automatically (src/lib/postmortemDraft.ts) — so an editor can ask for a
 * fresh draft any time, not just once at resolution.
 */
export function RootCauseInput(props: TextInputProps) {
  const { onChange, renderDefault } = props;
  const documentId = useFormValue(["_id"]) as string | undefined;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regenerate = useCallback(async () => {
    if (!documentId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/postmortem/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postmortemId: documentId.replace(/^drafts\./, ""),
        }),
      });
      const data = await response.json();

      if (!data.ok) {
        setError(
          data.reason === "draft_unavailable"
            ? "No draft — set GROQ_API_KEY to enable AI drafting."
            : "Regenerate failed.",
        );
        return;
      }

      onChange(set(data.rootCause));
    } catch {
      setError("Regenerate failed.");
    } finally {
      setLoading(false);
    }
  }, [documentId, onChange]);

  return (
    <Stack gap={2}>
      {renderDefault(props)}
      <Flex align="center" gap={2}>
        <Button
          mode="ghost"
          tone="primary"
          fontSize={1}
          padding={2}
          icon={SparklesIcon}
          text={loading ? "Drafting…" : "Regenerate with AI"}
          disabled={loading || !documentId}
          onClick={regenerate}
        />
        {error && (
          <Text size={1} muted>
            {error}
          </Text>
        )}
      </Flex>
    </Stack>
  );
}
