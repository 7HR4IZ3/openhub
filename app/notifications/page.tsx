import { NotificationsScreen } from "@/components/posts/notifications-screen";

export const metadata = {
  title: "Notifications",
  description:
    "Keep useful replies, mentions, and source-backed activity close.",
};

export default function NotificationsPage() {
  return (
    <NotificationsScreen
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
    />
  );
}
