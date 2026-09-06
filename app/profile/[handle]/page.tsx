import { PublicProfileScreen } from "@/components/curation/public-profile-screen";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <PublicProfileScreen handle={handle} />;
}
