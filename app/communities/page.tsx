import { CommunitiesScreen } from "@/components/curation/communities-screen";

export const metadata = {
  title: "Communities",
  description:
    "Find technical circles organized around repositories and source-backed discussion.",
};

export default function CommunitiesPage() {
  return (
    <CommunitiesScreen
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
    />
  );
}
