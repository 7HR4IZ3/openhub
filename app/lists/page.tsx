import { ListsScreen } from "@/components/curation/lists-screen";

export const metadata = {
  title: "Lists",
  description: "Curate repository and source trails with a point of view.",
};

export default function ListsPage() {
  return <ListsScreen convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)} />;
}
