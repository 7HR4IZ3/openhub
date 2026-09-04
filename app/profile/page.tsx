import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <PlaceholderScreen
      eyebrow="Developer identity"
      title="Let your work explain what you care about."
      body="Your OpenHub profile will combine imported GitHub context with your interests, source-backed posts, curated lists, portfolio, availability, reputation, and achievements."
      action="See the discovery map"
    />
  );
}
