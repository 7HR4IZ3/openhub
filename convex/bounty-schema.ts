import { defineTable } from "convex/server";
import { v } from "convex/values";

export const bountyStatus = v.union(
  v.literal("open"),
  v.literal("claimed"),
  v.literal("completed"),
  v.literal("cancelled"),
);

export const bountyDocument = v.object({
  _id: v.id("bounties"), _creationTime: v.number(), creatorId: v.id("users"),
  title: v.string(), description: v.string(), repositoryLabel: v.optional(v.string()),
  issueUrl: v.string(), paymentUrl: v.optional(v.string()), amount: v.optional(v.number()),
  currency: v.optional(v.string()), status: bountyStatus, createdAt: v.number(), updatedAt: v.number(),
});

export const bountyTables = {
  bounties: defineTable({
    creatorId: v.id("users"), title: v.string(), description: v.string(), repositoryLabel: v.optional(v.string()),
    issueUrl: v.string(), paymentUrl: v.optional(v.string()), amount: v.optional(v.number()), currency: v.optional(v.string()),
    status: bountyStatus, createdAt: v.number(), updatedAt: v.number(),
  })
    .index("by_status_created_at", ["status", "createdAt"])
    .index("by_creator_created_at", ["creatorId", "createdAt"]),
};
