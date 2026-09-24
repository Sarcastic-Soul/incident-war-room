import { defineField, defineType } from "sanity";

// Append-only — each update is its own document, not an entry in an array
// field on `incident`. Independent documents can be created concurrently by
// different responders with zero merge conflicts, sidestepping the
// optimistic-locking issues an array-field design would run into.
export const timelineEvent = defineType({
  name: "timelineEvent",
  title: "Timeline event",
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
      name: "author",
      title: "Author",
      type: "reference",
      to: [{ type: "responder" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "eventType",
      title: "Event type",
      type: "string",
      options: {
        list: [
          { title: "Update", value: "update" },
          { title: "Status change", value: "statusChange" },
          { title: "Severity change", value: "severityChange" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "createdAt",
      title: "Created at",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
  ],
  orderings: [
    {
      title: "Created at, oldest first",
      name: "createdAtAsc",
      by: [{ field: "createdAt", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "eventType",
      subtitle: "body",
    },
  },
});
