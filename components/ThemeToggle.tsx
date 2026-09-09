"use client";

import { DesktopIcon, MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <label className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground">
      <span className="sr-only">Appearance</span>
      {theme === "dark" ? (
        <MoonIcon className="h-4 w-4" aria-hidden="true" />
      ) : theme === "system" ? (
        <DesktopIcon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <SunIcon className="h-4 w-4" aria-hidden="true" />
      )}
      <select
        aria-label="Appearance"
        value={theme ?? "system"}
        onChange={(event) => setTheme(event.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
