import { SafetySettingsScreen } from "@/components/safety/safety-settings-screen";

export const metadata = { title: "Safety and control" };

export default function SafetyPage() {
  return (
    <SafetySettingsScreen
      convexConfigured={Boolean(process.env.NEXT_PUBLIC_CONVEX_URL)}
    />
  );
}
