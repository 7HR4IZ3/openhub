import { defineTable } from "convex/server";
import { v } from "convex/values";

export const subscriptionPlan = v.union(v.literal("free"), v.literal("pro"));
export const subscriptionStatus = v.union(
  v.literal("active"),
  v.literal("past_due"),
  v.literal("canceled"),
  v.literal("incomplete"),
);

export const subscriptionDocument = v.object({
  _id: v.id("subscriptions"),
  _creationTime: v.number(),
  userId: v.id("users"),
  provider: v.literal("manual"),
  plan: subscriptionPlan,
  status: subscriptionStatus,
  externalCustomerId: v.optional(v.string()),
  externalSubscriptionId: v.optional(v.string()),
  currentPeriodEndsAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const billingTables = {
  subscriptions: defineTable({
    userId: v.id("users"),
    provider: v.literal("manual"),
    plan: subscriptionPlan,
    status: subscriptionStatus,
    externalCustomerId: v.optional(v.string()),
    externalSubscriptionId: v.optional(v.string()),
    currentPeriodEndsAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_updated_at", ["userId", "updatedAt"])
    .index("by_external_subscription", ["provider", "externalSubscriptionId"]),
};
