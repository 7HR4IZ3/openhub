import { PlaceholderScreen } from "@/components/app/placeholder-screen";

export const metadata = { title: "Write a post" };

export default function ComposePage() {
  return (
    <PlaceholderScreen
      eyebrow="Source-backed writing"
      title="Start with the code you want to discuss."
      body="The contextual composer will let you attach a file, function, line range, diff, or repository before you publish a question, review, snippet, or discussion."
      action="Browse first"
    />
  );
}
