import { NextRequest, NextResponse } from "next/server";

import { getPublicGitHubProvider } from "@/lib/providers/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const cursor = request.nextUrl.searchParams.get("cursor");

  if (query.length === 0) {
    return NextResponse.json(
      { code: "QUERY_REQUIRED", message: "Add a search term." },
      { status: 400 },
    );
  }

  if (query.length > 200) {
    return NextResponse.json(
      {
        code: "QUERY_TOO_LONG",
        message: "Search terms must be 200 characters or fewer.",
      },
      { status: 400 },
    );
  }

  const provider = getPublicGitHubProvider();
  if (provider === null) {
    return NextResponse.json(
      {
        code: "GITHUB_PROVIDER_NOT_CONFIGURED",
        message: "GitHub discovery is not connected on this server yet.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await provider.searchRepositories({
      query,
      cursor,
      first: 12,
    });

    // This endpoint is intentionally public. Never allow a broadly-scoped
    // server credential to turn a private repository into public discovery.
    return NextResponse.json({
      ...result,
      items: result.items.filter((repository) => repository.visibility === "public"),
    });
  } catch (error) {
    console.error("GitHub repository search failed", error);
    return NextResponse.json(
      {
        code: "GITHUB_SEARCH_FAILED",
        message: "GitHub search is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}
