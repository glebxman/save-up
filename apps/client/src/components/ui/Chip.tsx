import type { HTMLAttributes } from "react";

import { cn } from "./cn";

type ChipColor = "accent" | "warning";

interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  color?: ChipColor;
  size?: "sm" | "md";
  variant?: "primary";
}

const chipColorClasses: Record<ChipColor, string> = {
  accent: "bg-[color-mix(in_srgb,var(--accent)_18%,var(--surface-secondary))] text-[var(--accent-foreground)]",
  warning: "bg-[color-mix(in_srgb,var(--warning)_18%,var(--surface-secondary))] text-[var(--warning-foreground)]",
};

export function Chip({ children, className, color = "accent", size = "md", variant: _variant, ...props }: ChipProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-3 py-1 font-semibold",
        chipColorClasses[color],
        size === "sm" ? "text-xs" : "text-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}
