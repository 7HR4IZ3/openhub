import type { ReactNode } from "react";

// Authentication and the realtime client are provided once by the root layout.
export default function HomeLayout({ children }: { children: ReactNode }) {
  return children;
}
