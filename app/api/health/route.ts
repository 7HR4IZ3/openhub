import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "openhub-web",
    checks: {
      convex: Boolean(process.env.NEXT_PUBLIC_CONVEX_URL),
      github: Boolean(process.env.GITHUB_PUBLIC_TOKEN),
    },
    timestamp: new Date().toISOString(),
  });
}
