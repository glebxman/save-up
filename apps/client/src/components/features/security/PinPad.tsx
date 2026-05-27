import { motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { hapticImpact } from "@/utils/haptic";
import { PIN_MAX_LENGTH } from "@/utils/pin";

interface PinPadProps {
  value: string;
  length?: number;
  onChange: (next: string) => void;
  /** Called automatically once `value.length === length`. */
  onSubmit?: (value: string) => void;
  /** Focus the input on mount — useful for the lock screen. */
  autoFocus?: boolean;
  /** Optional ARIA label for the hidden input. */
  ariaLabel?: string;
  /** When true, the dots flash red briefly. */
  shake?: boolean;
}

/**
 * PIN entry with the system numeric keyboard.
 *
 * We render visible "dots" for masking and overlay a transparent
 * `inputmode="numeric"` field on top. Tapping anywhere on the row focuses the
 * input which makes Telegram / iOS / Android raise the phone-style numpad
 * instead of our previous on-screen grid.
 */
export function PinPad({
  value,
  length = PIN_MAX_LENGTH,
  onChange,
  onSubmit,
  autoFocus,
  ariaLabel,
  shake,
}: PinPadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!autoFocus) return;
    // Defer to next frame so the element is mounted and the keyboard reliably
    // pops on iOS Safari.
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [autoFocus]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value.replace(/\D/g, "").slice(0, length);
    if (next === value) return;
    if (next.length > value.length) hapticImpact("light");
    onChange(next);
    if (next.length === length) onSubmit?.(next);
  };

  return (
    <div
      className="relative flex w-full max-w-xs cursor-text justify-center py-3"
      onClick={() => inputRef.current?.focus()}
    >
      <motion.div
        animate={shake ? { x: [-8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
        className="flex justify-center gap-3"
        transition={{ duration: 0.4 }}
      >
        {Array.from({ length }, (_, i) => {
          const filled = i < value.length;
          return (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full transition-colors ${
                shake
                  ? "bg-[var(--danger)]"
                  : filled
                    ? "bg-[var(--accent)]"
                    : "bg-[var(--surface-tertiary)]"
              }`}
            />
          );
        })}
      </motion.div>

      <input
        ref={inputRef}
        aria-label={ariaLabel ?? "PIN"}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent outline-none"
        inputMode="numeric"
        maxLength={length}
        onChange={handleChange}
        pattern="[0-9]*"
        type="text"
        value={value}
      />
    </div>
  );
}
