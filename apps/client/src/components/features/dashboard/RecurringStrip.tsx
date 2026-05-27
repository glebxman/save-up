import { useTranslation } from "react-i18next";

import { ArrowDownLeftIcon, ArrowUpRightIcon } from "@/components/layout/icons";
import type { RecurringTransaction } from "@/types/finance";
import { formatMoney } from "@/utils/format";
import { hapticImpact } from "@/utils/haptic";

interface RecurringStripProps {
  templates: RecurringTransaction[];
  busyTemplateId?: string | null;
  onAdd: () => void;
  onEdit: (template: RecurringTransaction) => void;
  onApply: (template: RecurringTransaction) => void;
}

function getTone(type: RecurringTransaction["type"]): "income" | "expense" {
  return type === "income" || type === "transfer_from_savings" ? "income" : "expense";
}

/**
 * Horizontal scroll strip of recurring templates. Tap = run, edit affordance
 * via a small pencil corner, the trailing card is "+ add new". Replaces the
 * legacy stack of full-width cards which dominated the dashboard.
 */
export function RecurringStrip({
  templates,
  busyTemplateId,
  onAdd,
  onEdit,
  onApply,
}: RecurringStripProps) {
  const { t } = useTranslation();

  if (templates.length === 0) {
    return (
      <section data-onboarding="templates">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {t("recurring.title")}
          </p>
          <button
            className="flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-xs font-semibold text-[var(--foreground)] transition active:opacity-70"
            onClick={onAdd}
            type="button"
          >
            + {t("recurring.add")}
          </button>
        </div>
        <div className="flex items-center justify-center rounded-[20px] bg-[var(--surface-secondary)] py-5 text-sm text-[var(--muted)]">
          {t("recurring.empty")}
        </div>
      </section>
    );
  }

  return (
    <section data-onboarding="templates">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          {t("recurring.title")}
        </p>
      </div>

      <div className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
        {templates.map((template) => {
          const isBusy = busyTemplateId === template.id;
          const tone = getTone(template.type);

          return (
            <div
              key={template.id}
              className={`relative w-[180px] shrink-0 snap-start rounded-[20px] bg-[var(--surface-secondary)] p-3 transition ${
                isBusy ? "opacity-60" : "active:opacity-80"
              }`}
            >
              <button
                aria-label={t("recurring.edit")}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)] transition active:scale-95"
                disabled={isBusy}
                onClick={() => onEdit(template)}
                type="button"
              >
                <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z" />
                </svg>
              </button>

              <button
                className="block w-full text-left"
                disabled={isBusy}
                onClick={() => {
                  hapticImpact("medium");
                  onApply(template);
                }}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    tone === "income"
                      ? "bg-[color-mix(in_srgb,var(--accent)_30%,var(--surface-secondary))] text-[var(--accent-text)]"
                      : "bg-[color-mix(in_srgb,var(--danger)_22%,var(--surface-secondary))] text-[var(--danger)]"
                  }`}
                >
                  {tone === "income" ? (
                    <ArrowUpRightIcon className="h-4 w-4" />
                  ) : (
                    <ArrowDownLeftIcon className="h-4 w-4" />
                  )}
                </span>
                <p className="m-0 mt-2 truncate pr-6 text-sm font-semibold text-[var(--foreground)]">
                  {template.title}
                </p>
                <p className="m-0 mt-0.5 truncate text-xs text-[var(--muted)]">
                  {formatMoney(template.amount)}
                  {template.autoApply && template.dayOfMonth ? (
                    <span className="ml-1 text-[var(--accent-text)]">· {template.dayOfMonth}</span>
                  ) : null}
                </p>
              </button>
            </div>
          );
        })}

        <button
          aria-label={t("recurring.add")}
          className="flex w-[110px] shrink-0 snap-start flex-col items-center justify-center gap-1.5 rounded-[20px] border-2 border-dashed border-[var(--separator)] p-3 text-[var(--muted)] transition active:opacity-70"
          onClick={onAdd}
          type="button"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="text-xs">{t("recurring.add")}</span>
        </button>
      </div>
    </section>
  );
}
