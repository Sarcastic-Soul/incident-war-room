import { defineArrayMember, defineField, defineType } from "sanity";

export const runbook = defineType({
  name: "runbook",
  title: "Runbook",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "applicableSeverity",
      title: "Applicable severity",
      type: "array",
      of: [defineArrayMember({ type: "string" })],
      options: {
        list: [
          { title: "SEV1", value: "SEV1" },
          { title: "SEV2", value: "SEV2" },
          { title: "SEV3", value: "SEV3" },
          { title: "SEV4", value: "SEV4" },
        ],
      },
    }),
    defineField({
      name: "steps",
      title: "Steps",
      type: "array",
      of: [defineArrayMember({ type: "block" })],
    }),
    defineField({
      name: "linkedIncidents",
      title: "Linked incidents",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "incident" }] })],
    }),
  ],
  preview: {
    select: {
      title: "title",
    },
  },
});
