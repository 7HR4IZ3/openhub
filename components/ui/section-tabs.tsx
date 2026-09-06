"use client";

import { useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionTabs<T extends string>({
  label,
  items,
  value,
  onChange,
  children,
}: {
  label: string;
  items: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  children: ReactNode;
}) {
  const id = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <>
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-6 overflow-x-auto border-b px-5 sm:px-8"
      >
        {items.map((item, index) => (
          <button
            key={item.value}
            ref={(node) => {
              buttons.current[index] = node;
            }}
            id={`${id}-${item.value}`}
            type="button"
            role="tab"
            aria-selected={value === item.value}
            aria-controls={`${id}-panel`}
            tabIndex={value === item.value ? 0 : -1}
            onClick={() => onChange(item.value)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % items.length
                  : event.key === "ArrowLeft"
                    ? (index + items.length - 1) % items.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? items.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                onChange(items[next].value);
                buttons.current[next]?.focus();
              }
            }}
            className={cn(
              "min-h-14 shrink-0 whitespace-nowrap border-b-2 border-transparent text-sm text-muted-foreground transition-colors hover:text-foreground",
              value === item.value &&
                "border-foreground font-semibold text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        id={`${id}-panel`}
        role="tabpanel"
        aria-labelledby={`${id}-${value}`}
        tabIndex={0}
      >
        {children}
      </div>
    </>
  );
}
