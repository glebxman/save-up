import {
  createContext,
  useContext,
  type HTMLAttributes,
  type PropsWithChildren,
} from "react";

import { cn } from "./cn";

interface ProgressContextValue {
  value: number;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

interface ProgressBarProps extends PropsWithChildren {
  value: number;
  "aria-label"?: string;
  color?: "accent";
  size?: "lg" | "md";
}

function ProgressBarRoot({ children, color: _color, size: _size, value, ...props }: ProgressBarProps) {
  return (
    <ProgressContext.Provider value={{ value: Math.max(0, Math.min(100, value)) }}>
      <div {...props}>{children}</div>
    </ProgressContext.Provider>
  );
}

function ProgressTrack({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-tertiary)]", className)}
    >
      {children}
    </div>
  );
}

function ProgressFill({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const context = useContext(ProgressContext);

  if (!context) {
    throw new Error("ProgressBar.Fill must be used inside ProgressBar");
  }

  return (
    <div
      {...props}
      className={cn("h-full rounded-full bg-[var(--accent)] transition-[width] duration-300", className)}
      style={{ width: `${context.value}%` }}
    />
  );
}

export const ProgressBar = Object.assign(ProgressBarRoot, {
  Track: ProgressTrack,
  Fill: ProgressFill,
});
