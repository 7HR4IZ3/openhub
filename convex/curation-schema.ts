import { defineTable } from "convex/server";
import { v } from "convex/values";

export const visibility = v.union(v.literal("public"), v.literal("private"));
export const role = v.union(v.literal("owner"), v.literal("moderator"), v.literal("member"));
export const membershipStatus = v.union(v.literal("active"), v.literal("banned"));
export const itemTarget = v.union(
  v.object({ kind: v.literal("repo"), repositoryId: v.id("repositories") }),
  v.object({ kind: v.literal("post"), postId: v.id("posts") }),
);
export const followTarget = v.union(
  v.object({ kind: v.literal("person"), userId: v.id("users") }),
  v.object({ kind: v.literal("repo"), repositoryId: v.id("repositories") }),
  v.object({ kind: v.literal("topic"), slug: v.string() }),
  v.object({ kind: v.literal("category"), slug: v.string() }),
);

const listFields = {
  ownerId: v.id("users"), title: v.string(), description: v.string(),
  visibility, createdAt: v.number(), updatedAt: v.number(),
};
const itemFields = {
  listId: v.id("lists"), target: itemTarget, targetKey: v.string(), createdAt: v.number(),
};
const communityFields = {
  ownerId: v.id("users"), name: v.string(), description: v.string(),
  visibility, createdAt: v.number(), updatedAt: v.number(),
};
const membershipFields = {
  communityId: v.id("communities"), userId: v.id("users"), role,
  status: membershipStatus, createdAt: v.number(), updatedAt: v.number(),
};
const followFields = {
  userId: v.id("users"), target: followTarget, targetKey: v.string(), createdAt: v.number(),
};

export const listDocument = v.object({ _id: v.id("lists"), _creationTime: v.number(), ...listFields });
export const itemDocument = v.object({ _id: v.id("listItems"), _creationTime: v.number(), ...itemFields });
export const communityDocument = v.object({ _id: v.id("communities"), _creationTime: v.number(), ...communityFields });
export const membershipDocument = v.object({ _id: v.id("communityMemberships"), _creationTime: v.number(), ...membershipFields });
export const followDocument = v.object({ _id: v.id("follows"), _creationTime: v.number(), ...followFields });

// Integrator: spread curationTables into the application's defineSchema call.
export const curationTables = {
  lists: defineTable(listFields)
    .index("by_visibility", ["visibility"])
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_and_visibility", ["ownerId", "visibility"])
    .searchIndex("search_title", { searchField: "title", filterFields: ["visibility"] }),
  listItems: defineTable(itemFields)
    .index("by_listId", ["listId"])
    .index("by_listId_and_targetKey", ["listId", "targetKey"]),
  communities: defineTable(communityFields)
    .index("by_visibility", ["visibility"])
    .index("by_ownerId", ["ownerId"])
    .searchIndex("search_name", { searchField: "name", filterFields: ["visibility"] }),
  communityMemberships: defineTable(membershipFields)
    .index("by_communityId_and_userId", ["communityId", "userId"])
    .index("by_communityId_and_status", ["communityId", "status"])
    .index("by_userId_and_status", ["userId", "status"]),
  follows: defineTable(followFields)
    .index("by_userId", ["userId"])
    .index("by_userId_and_targetKey", ["userId", "targetKey"])
    .index("by_targetKey", ["targetKey"]),
};
