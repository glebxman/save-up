import type { HTMLAttributes } from "react";

import { cn } from "./cn";

type CardVariant = "default" | "secondary";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const cardVariantClasses: Record<CardVariant, string> = {
  default: "bg-[color-mix(in_srgb,var(--surface)_98%,transparent)]",
  secondary: "bg-[color-mix(in_srgb,var(--surface-secondary)_94%,transparent)]",
};

export function Card({ children, className, variant = "default", ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-[30px] backdrop-blur-xl",
        cardVariantClasses[variant],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("px-5 pt-5 sm:px-6 sm:pt-6", className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className, compact, ...props }: HTMLAttributes<HTMLDivElement> & { compact?: boolean }) {
  return (
    <div {...props} className={cn(compact ? "p-4" : "p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2 {...props} className={cn("m-0 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]", className)}>
      {children}
    </h2>
  );
}

export function CardDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p {...props} className={cn("m-0 text-sm text-[var(--muted)]", className)}>
      {children}
    </p>
  );
}
