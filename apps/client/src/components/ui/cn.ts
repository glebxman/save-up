import { twMerge } from "tailwind-merge";

/** Join truthy class name fragments into a single className string, resolving conflicting Tailwind utilities (last one wins). */
export function cn(...values: Array<string | false | null | undefined>) {
  return twMerge(values.filter(Boolean).join(" "));
}
