import { notFound } from "next/navigation";

import { PostDetailScreen } from "@/components/posts/post-detail-screen";

export const dynamic = "force-dynamic";

type PostPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) notFound();

  return (
    <PostDetailScreen
      postId={id}
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
    />
  );
}
