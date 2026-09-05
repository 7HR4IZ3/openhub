import { BountiesScreen } from "@/components/curation/bounties-screen";

export const metadata = { title: "Tasks and bounties", description: "Concrete contribution paths linked to external issue and reward systems." };

export default function BountiesPage() {
  return <BountiesScreen convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)} />;
}
