import { defineArrayMember, defineField, defineType } from "sanity";
import { RootCauseInput } from "../components/RootCauseInput";

export const postmortem = defineType({
  name: "postmortem",
  title: "Postmortem",
  type: "document",
  fields: [
    defineField({
      name: "incident",
      title: "Incident",
      type: "reference",
      to: [{ type: "incident" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "timelineSnapshot",
      title: "Timeline snapshot",
      description:
        "A copied, frozen snapshot of every timelineEvent at resolution time — plain objects, not references, so later edits to live timelineEvent documents can't change what the postmortem shows.",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "timelineSnapshotEntry",
          fields: [
            defineField({
              name: "eventType",
              title: "Event type",
              type: "string",
            }),
            defineField({
              name: "body",
              title: "Body",
              type: "text",
            }),
            defineField({
              name: "authorName",
              title: "Author name",
              type: "string",
            }),
            defineField({
              name: "createdAt",
              title: "Created at",
              type: "datetime",
            }),
          ],
          preview: {
            select: {
              title: "eventType",
              subtitle: "body",
            },
          },
        }),
      ],
    }),
    defineField({
      name: "rootCause",
      title: "Root cause",
      type: "text",
      description:
        "Drafted by an LLM from the frozen timeline when the incident resolves; edit freely or hit Regenerate for a fresh draft.",
      components: {
        input: RootCauseInput,
      },
    }),
    defineField({
      name: "actionItems",
      title: "Action items",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "incident.title",
      subtitle: "publishedAt",
    },
  },
});
