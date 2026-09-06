import { ListDetailScreen } from "@/components/curation/list-detail-screen";

export const dynamic = "force-dynamic";

export default async function ListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ListDetailScreen listId={id} />;
}
