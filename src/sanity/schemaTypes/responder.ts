import { defineField, defineType } from "sanity";

export const responder = defineType({
  name: "responder",
  title: "Responder",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      description: "e.g. on-call-lead, engineer, comms",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "onCallTeam",
      title: "On-call team",
      type: "string",
    }),
  ],
  preview: {
    select: {
      title: "name",
      subtitle: "role",
    },
  },
});
