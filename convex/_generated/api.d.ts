/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as comments from "../comments.js";
import type * as curation from "../curation.js";
import type * as discovery from "../discovery.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as posts from "../posts.js";
import type * as profiles from "../profiles.js";
import type * as repositories from "../repositories.js";
import type * as reputation from "../reputation.js";
import type * as search from "../search.js";
import type * as social from "../social.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  comments: typeof comments;
  curation: typeof curation;
  discovery: typeof discovery;
  http: typeof http;
  notifications: typeof notifications;
  posts: typeof posts;
  profiles: typeof profiles;
  repositories: typeof repositories;
  reputation: typeof reputation;
  search: typeof search;
  social: typeof social;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
