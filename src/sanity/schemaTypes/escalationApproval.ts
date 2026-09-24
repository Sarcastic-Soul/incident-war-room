import { defineArrayMember, defineField, defineType } from "sanity";

// Represents one severity-escalation request and its approval state.
// Created when someone tries to raise an incident to SEV1. This is a
// first-class document (not a boolean flag on `incident`) because the
// approval process itself needs an audit trail: who approved, when, and how
// many were required. Managed through a Sanity Workflow: the
// `pending` -> `approved` transition is gated on
// `approvals.length >= requiredApprovals`, and only that transition is
// allowed to trigger creation of a `statusPageEntry`.
export const escalationApproval = defineType({
  name: "escalationApproval",
  title: "Escalation approval",
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
      name: "requestedSeverity",
      title: "Requested severity",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "requiredApprovals",
      title: "Required approvals",
      type: "number",
      description: "2 for SEV1",
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: "approvals",
      title: "Approvals",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          name: "approval",
          fields: [
            defineField({
              name: "approver",
              title: "Approver",
              type: "reference",
              to: [{ type: "responder" }],
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "approvedAt",
              title: "Approved at",
              type: "datetime",
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: {
            select: {
              title: "approver.name",
              subtitle: "approvedAt",
            },
          },
        }),
      ],
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Pending", value: "pending" },
          { title: "Approved", value: "approved" },
          { title: "Rejected", value: "rejected" },
        ],
      },
      initialValue: "pending",
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: {
      title: "requestedSeverity",
      subtitle: "status",
    },
  },
});
