import { CommunityDetailScreen } from "@/components/curation/community-detail-screen";

export const metadata = {
  title: "Community",
  description: "A focused OpenHub space for source-backed discussion.",
};

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CommunityDetailScreen communityId={id} />;
}
