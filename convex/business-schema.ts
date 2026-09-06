import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sponsorshipLinkDocument = v.object({
  _id: v.id("sponsorshipLinks"),
  _creationTime: v.number(),
  repositoryId: v.id("repositories"),
  ownerUserId: v.id("users"),
  label: v.string(),
  url: v.string(),
  note: v.optional(v.string()),
  active: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const businessTables = {
  sponsorshipLinks: defineTable({
    repositoryId: v.id("repositories"),
    ownerUserId: v.id("users"),
    label: v.string(),
    url: v.string(),
    note: v.optional(v.string()),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_repository_active", ["repositoryId", "active"])
    .index("by_owner_updated_at", ["ownerUserId", "updatedAt"]),
};
