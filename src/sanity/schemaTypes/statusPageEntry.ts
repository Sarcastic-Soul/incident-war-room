import { defineField, defineType } from "sanity";

// Only created by the Workflow transition when an `escalationApproval`
// reaches `approved` for a public-facing severity.
export const statusPageEntry = defineType({
  name: "statusPageEntry",
  title: "Status page entry",
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
      name: "publicSummary",
      title: "Public summary",
      type: "text",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "publishedAt",
      title: "Published at",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "incident.title",
      subtitle: "publishedAt",
    },
  },
});
