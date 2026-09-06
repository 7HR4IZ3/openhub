import { NextResponse } from "next/server";
import { getPublicGitHubProvider } from "@/lib/providers/server";
import {
  searchBitbucket,
  searchCodeberg,
  searchGitLab,
} from "@/lib/providers/cross-provider-search";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 120)
    return NextResponse.json(
      { items: [], message: "Search needs between 2 and 120 characters." },
      { status: 400 },
    );
  const github = getPublicGitHubProvider();
  const results = await Promise.allSettled([
    github?.searchRepositories({ query, first: 20 }) ??
      Promise.resolve({ items: [], hasNextPage: false, cursor: null }),
    searchGitLab(query),
    searchBitbucket(query),
    searchCodeberg(query),
  ]);
  const items = results.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value.items.filter((item) => item.visibility === "public")
      : [],
  );
  const unique = new Map(
    items.map((item) => [
      `${item.provider}:${item.providerRepositoryId}`,
      item,
    ]),
  );
  return NextResponse.json(
    { items: [...unique.values()].slice(0, 60) },
    {
      headers: {
        "Cache-Control":
          "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
      },
    },
  );
}
