import { ProfileScreen } from "@/components/curation/profile-screen";

export const metadata = {
  title: "Profile",
  description:
    "Build a developer profile around the repositories and source you want to understand.",
};

export default function ProfilePage() {
  return (
    <ProfileScreen
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
    />
  );
}
