import { PublicProfileScreen } from "@/components/curation/public-profile-screen";

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <PublicProfileScreen handle={handle} convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)} />;
}
