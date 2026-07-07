import { Children, type PropsWithChildren, type ReactNode } from "react";

import { Card, CardContent } from "@/components/ui";

interface SettingsSectionProps extends PropsWithChildren {
  /** Optional uppercase eyebrow above the card. Skip for the top of the page. */
  title?: string;
  /** Small caption rendered under the title. */
  description?: ReactNode;
}

/**
 * Group of settings rows. We render the section title outside the card so the
 * card can stay as a clean rounded surface. Dividers are inserted automatically
 * between children.
 */
export function SettingsSection({ title, description, children }: SettingsSectionProps) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <section className="space-y-2">
      {title ? (
        <header>
          <h2
            className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]"
          >
            {title}
          </h2>
          {description ? (
            <p className="m-0 mt-1 text-xs text-[var(--muted)]">{description}</p>
          ) : null}
        </header>
      ) : null}

      <Card variant="default">
        <CardContent className="p-0 sm:p-0 py-[4px] sm:py-[4px] px-0 sm:px-0">
          {items.map((child, index) => (
            <div key={index}>
              {child}
              {index < items.length - 1 ? (
                <div className="mx-4 h-px bg-[var(--separator)]" />
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
