import type { ComponentPropsWithoutRef } from "react";

import { cn } from "./cn";

const fieldClasses =
  "min-h-12 rounded-[22px] border border-[var(--field-border)] bg-[var(--field-background)] px-4 py-3 text-sm text-[var(--field-foreground)] outline-none transition placeholder:text-[var(--field-placeholder)] focus:bg-[color-mix(in_srgb,var(--field-background)_70%,white_6%)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)]";

interface InputProps extends ComponentPropsWithoutRef<"input"> {
  fullWidth?: boolean;
  variant?: "secondary";
}

export function Input({ className, fullWidth, variant: _variant, ...props }: InputProps) {
  return <input {...props} className={cn(fieldClasses, fullWidth && "w-full", className)} />;
}

interface TextAreaProps extends ComponentPropsWithoutRef<"textarea"> {
  fullWidth?: boolean;
  variant?: "secondary";
}

export function TextArea({ className, fullWidth, variant: _variant, ...props }: TextAreaProps) {
  return <textarea {...props} className={cn(fieldClasses, "min-h-[112px] resize-y", fullWidth && "w-full", className)} />;
}

interface SelectProps extends ComponentPropsWithoutRef<"select"> {
  fullWidth?: boolean;
  variant?: "secondary";
}

export function Select({ children, className, fullWidth, variant: _variant, ...props }: SelectProps) {
  return (
    <select {...props} className={cn(fieldClasses, "appearance-none pr-10", fullWidth && "w-full", className)}>
      {children}
    </select>
  );
}
