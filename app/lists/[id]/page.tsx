import { ListDetailScreen } from "@/components/curation/list-detail-screen";
import { notFound } from "next/navigation";

export default async function ListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) notFound();
  return <ListDetailScreen listId={id} convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)} />;
}
