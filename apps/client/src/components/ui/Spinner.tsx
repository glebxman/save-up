import { cn } from "./cn";

interface SpinnerProps {
  size?: "sm" | "md";
}

export function Spinner({ size = "md" }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block animate-spin rounded-full border-2 border-white/10 border-t-[var(--accent)]",
        size === "sm" ? "h-4 w-4" : "h-5 w-5",
      )}
    />
  );
}
