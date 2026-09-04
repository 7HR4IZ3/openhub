import ConvexClientProvider from "@/components/ConvexClientProvider";
import { ReactNode } from "react";

export default function HomeLayout({ children }: { children: ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
