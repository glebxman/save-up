import type { ButtonHTMLAttributes } from "react";

import { hapticImpact } from "@/utils/haptic";
import { cn } from "./cn";

type ButtonVariant = "primary" | "secondary" | "danger-soft";
type ButtonSize = "xs" | "sm" | "md";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isDisabled?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
}

const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-[0.98] disabled:hover:brightness-100",
  secondary:
    "bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[var(--surface-tertiary)]",
  "danger-soft":
    "bg-[color-mix(in_srgb,var(--danger)_16%,var(--surface-secondary))] text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_24%,var(--surface-secondary))]",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  xs: "min-h-8 rounded-[12px] px-2.5 text-xs font-semibold",
  sm: "min-h-10 rounded-[18px] px-3 text-sm",
  md: "min-h-12 rounded-[22px] px-4 text-sm",
};

export function Button({
  children,
  className,
  fullWidth,
  isDisabled,
  onClick,
  onPress,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ButtonProps) {
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isDisabled) {
      hapticImpact("light");
    }
    onClick?.(e);
    if (!isDisabled) {
      onPress?.();
    }
  }

  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 border-0 font-medium tracking-[-0.01em] transition disabled:cursor-not-allowed disabled:opacity-55",
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      disabled={isDisabled}
      onClick={handleClick}
      type={type}
    >
      {children}
    </button>
  );
}
