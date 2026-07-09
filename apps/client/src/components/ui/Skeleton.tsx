import type { HTMLAttributes } from "react";

import { cn } from "./cn";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular" | "text";
}

export function Skeleton({ className, variant = "rectangular", ...props }: SkeletonProps) {
  return (
    <div
      {...props}
      className={cn(
        "animate-shimmer",
        variant === "circular" && "rounded-full",
        variant === "rectangular" && "rounded-[30px]",
        variant === "text" && "h-4 rounded-[18px]",
        className,
      )}
    />
  );
}
