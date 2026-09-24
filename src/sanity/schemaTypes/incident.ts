import { defineField, defineType } from "sanity";

export const incident = defineType({
  name: "incident",
  title: "Incident",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "severity",
      title: "Severity",
      type: "string",
      options: {
        list: [
          { title: "SEV1", value: "SEV1" },
          { title: "SEV2", value: "SEV2" },
          { title: "SEV3", value: "SEV3" },
          { title: "SEV4", value: "SEV4" },
        ],
        layout: "radio",
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Investigating", value: "investigating" },
          { title: "Mitigated", value: "mitigated" },
          { title: "Resolved", value: "resolved" },
          { title: "Escalated", value: "escalated" },
        ],
      },
      initialValue: "investigating",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "owner",
      title: "Owner",
      type: "reference",
      to: [{ type: "responder" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "openedAt",
      title: "Opened at",
      type: "datetime",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "resolvedAt",
      title: "Resolved at",
      type: "datetime",
    }),
  ],
  preview: {
    select: {
      title: "title",
      subtitle: "severity",
    },
  },
});
