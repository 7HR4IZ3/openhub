const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

// Execute actual TS handlers with isolated framework boundaries, not copied logic.
function load(relative, extra = {}) {
  const filename = path.resolve(relative);
  const loadedModule = { exports: {} };
  const validator = new Proxy(() => validator, { get: () => validator });
  const stubs = {
    "server-only": {},
    "convex/values": { v: validator },
    "@convex-dev/auth/server": { getAuthUserId: async (ctx) => ctx.userId ?? null },
    "./_generated/server": { query: (x) => x, mutation: (x) => x },
  };
  const code = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports: loadedModule.exports, module: loadedModule, console, process, URL, ...extra,
    require: (id) => id in stubs ? stubs[id] : id.startsWith(".")
      ? load(path.resolve(path.dirname(filename), `${id}.ts`), extra) : require(id),
  }, { filename });
  return loadedModule.exports;
}

const posts = load("convex/posts.ts");
const social = load("convex/social.ts");
const access = load("convex/post-access.ts");

test("private and followers-only posts fail closed for other users", () => {
  for (const visibility of ["private", "followers"]) {
    const post = { visibility, authorId: "owner" };
    assert.equal(access.canViewPost(post, "other"), false);
    assert.equal(access.canViewPost(post, null), false);
    assert.equal(access.canViewPost(post, "owner"), true);
  }
});

test("unverified source attachments cannot reach storage", async () => {
  await assert.rejects(posts.create.handler({ userId: "author" }, {
    body: "caption", visibility: "public", type: "snippet",
    sourceReference: { startLine: 1, endLine: 1, sourceSnapshot: "secret", visibility: "public" },
  }), /server-side verification/);
});

test("private quote does not create public activity", async () => {
  await assert.rejects(posts.createQuote.handler({
    userId: "reader", db: { get: async () => ({ visibility: "public", authorId: "owner" }) },
  }, { postId: "post", body: "private thought", visibility: "private" }), /Non-public quotes/);
});

test("even the author cannot repost private content", async () => {
  await assert.rejects(social.toggleRepost.handler({
    userId: "owner", db: { get: async () => ({ visibility: "private", authorId: "owner" }) },
  }, { postId: "post" }), /Only public posts/);
});

test("viewer repost state never uses a unique query on repeatable quotes", async () => {
  const db = {
    get: async () => ({ _id: "post", visibility: "public", likeCount: 0, repostCount: 2 }),
    query: () => ({ withIndex: (_name, fn) => {
      const index = { eq: (key, value) => {
        assert.notEqual(value, "quote", "quote rows are not unique per viewer");
        return index;
      } };
      fn(index);
      return { unique: async () => null };
    } }),
  };
  const result = await social.viewerState.handler({ db, userId: "reader" }, { postId: "post" });
  assert.equal(result.reposted, false);
  assert.equal(result.repostCount, 2);
});

test("directory and binary GitHub objects are not returned as text files", async () => {
  for (const object of [{}, { __typename: "Tree" }, { __typename: "Blob", text: null }]) {
    const github = load("lib/providers/github.ts", {
      fetch: async () => ({ ok: true, json: async () => ({ data: { repository: { object } } }) }),
    });
    assert.equal(await github.createGitHubProvider("test-token").getFile({
      owner: "owner", name: "repo", path: "src", ref: "a".repeat(40),
    }), null);
  }
});
