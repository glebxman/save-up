import type { ComponentPropsWithoutRef, HTMLAttributes } from "react";

import { cn } from "./cn";

function AvatarRoot({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex overflow-hidden rounded-full bg-[var(--surface-secondary)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function AvatarImage({ src, alt = "", className, ...props }: ComponentPropsWithoutRef<"img">) {
  return <img {...props} alt={alt} className={cn("h-full w-full object-cover", className)} src={src} />;
}

export const Avatar = Object.assign(AvatarRoot, {
  Image: AvatarImage,
});
