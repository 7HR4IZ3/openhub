import { HomeScreen } from "@/components/home/home-screen";

export const metadata = {
  title: "Home",
  description:
    "Find repositories, source-backed posts, and technical conversations worth following.",
};

export default function HomePage() {
  return (
    <HomeScreen
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
    />
  );
}
