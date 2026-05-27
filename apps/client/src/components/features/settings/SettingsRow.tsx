import type { ComponentType, ReactNode, SVGProps } from "react";

import { ChevronRightIcon } from "@/components/layout/icons";

interface SettingsRowBaseProps {
  /** Optional Heroicon-style icon component shown in the colored badge. */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  /** When provided we render a custom slot in the badge (e.g. a flag or symbol). */
  iconSlot?: ReactNode;
  iconBg?: string;
  /** Tailwind color class for the icon glyph itself; defaults to `text-white`. */
  iconColor?: string;
  title: string;
  description?: ReactNode;
  /** Right-side text (e.g. current theme name). */
  value?: ReactNode;
  /** Right-side custom slot (e.g. action button, replaces both value and chevron). */
  trailing?: ReactNode;
  /** Hide the chevron, e.g. for inline action rows. */
  hideChevron?: boolean;
  /** Used by the onboarding overlay to spotlight this row. */
  dataOnboarding?: string;
  destructive?: boolean;
  onPress?: () => void;
  /** Optional `<a>`-style attributes when used as a navigation row. */
  ariaLabel?: string;
}

/**
 * One row inside a settings card.
 *
 * Replaces the ~30-line button blocks that were duplicated for every entry on
 * the legacy Settings page. Pass `onPress` to make it tappable, or omit it for
 * a static row (e.g. exchange rates with a refresh button on the right).
 */
export function SettingsRow({
  icon: Icon,
  iconSlot,
  iconBg = "bg-[var(--surface-secondary)]",
  iconColor = "text-white",
  title,
  description,
  value,
  trailing,
  hideChevron,
  dataOnboarding,
  destructive,
  onPress,
  ariaLabel,
}: SettingsRowBaseProps) {
  const content = (
    <>
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] ${iconBg} ${iconColor}`}
        >
          {iconSlot ?? (Icon ? <Icon className="h-4 w-4" /> : null)}
        </span>

        <div className="min-w-0">
          <p
            className={`m-0 text-sm font-semibold ${
              destructive ? "text-[var(--danger)]" : "text-[var(--foreground)]"
            }`}
          >
            {title}
          </p>
          {description ? (
            <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">{description}</p>
          ) : null}
        </div>
      </div>

      {trailing ? (
        <div className="shrink-0">{trailing}</div>
      ) : (
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-[var(--muted)]">
          {value ? <span className="truncate">{value}</span> : null}
          {!hideChevron ? (
            <ChevronRightIcon className="h-3.5 w-3.5 shrink-0 text-[var(--muted)] opacity-70" />
          ) : null}
        </div>
      )}
    </>
  );

  const className = "flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left";

  if (!onPress) {
    return (
      <div aria-label={ariaLabel} className={className} data-onboarding={dataOnboarding}>
        {content}
      </div>
    );
  }

  return (
    <button
      aria-label={ariaLabel}
      className={`${className} transition active:opacity-70`}
      data-onboarding={dataOnboarding}
      onClick={onPress}
      type="button"
    >
      {content}
    </button>
  );
}
