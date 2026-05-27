import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { getCategoryDisplay, isBuiltinCategory } from "@/components/features/shared/categoryMeta";
import { Card, CardContent, Chip } from "@/components/ui";
import { useFinance } from "@/hooks/useFinance";
import type { CategoryBreakdown } from "@/types/finance";
import { formatMoney } from "@/utils/format";

interface CategoryBreakdownViewProps {
  breakdown: CategoryBreakdown;
}

function getPercent(value: number, total: number): number {
  if (value <= 0 || total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(1));
}

function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function CategoryBreakdownView({ breakdown }: CategoryBreakdownViewProps) {
  const { t } = useTranslation();
  const { status } = useFinance();
  const customCategories = status?.user.customCategories ?? [];
  const customizations = status?.user.categoryCustomizations ?? {};

  const chartItems = useMemo(
    () =>
      [...breakdown.items]
        .sort((a, b) => b.total - a.total)
        .map((item) => {
          const display = getCategoryDisplay(item.category, {
            customCategories,
            customizations,
            t,
          });
          const limit = status?.user.categoryLimits?.[item.category] ?? 0;
          const limitPercent = limit > 0 ? Math.round((item.total / limit) * 100) : 0;
          const overLimit = limit > 0 && item.total > limit;

          return {
            ...item,
            color: display.chartColor,
            Icon: display.Icon,
            emoji: display.emoji,
            label: display.name,
            percent: getPercent(item.total, breakdown.expenseTotal),
            limit,
            limitPercent,
            overLimit,
          };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [breakdown.expenseTotal, breakdown.items, customCategories, customizations, status?.user.categoryLimits, t],
  );

  const transactionCount = chartItems.reduce((sum, item) => sum + item.count, 0);
  const topItem = chartItems[0];
  const hasOverLimit = chartItems.some((item) => item.overLimit);

  if (chartItems.length === 0 || !topItem) {
    return (
      <Card variant="secondary">
        <CardContent>
          <p className="py-4 text-center text-sm text-[var(--muted)]">{t("analytics.noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const TopIcon = topItem.Icon;

  return (
    <Card className="overflow-hidden" variant="default">
      <CardContent className="space-y-4">
        {hasOverLimit ? (
          <div className="flex items-center gap-2 rounded-[18px] bg-[color-mix(in_srgb,var(--danger)_14%,var(--surface-secondary))] px-3 py-2 text-sm text-[var(--danger)]">
            <span aria-hidden="true">⚠️</span>
            <span className="font-medium">{t("limits.warningTitle", { defaultValue: "One or more categories are over their limit" })}</span>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0 rounded-[24px] bg-[var(--surface-secondary)] p-4">
            <p className="m-0 text-sm text-[var(--muted)]">{t("analytics.totalExpenses")}</p>
            <h2 className="m-0 mt-2 break-words text-[2.1rem] font-semibold leading-none tracking-normal text-[var(--foreground)]">
              {formatMoney(breakdown.expenseTotal)}
            </h2>
            <p className="m-0 mt-2 text-xs leading-relaxed text-[var(--muted)]">{t("analytics.howToReadDescription")}</p>
          </div>

          <div className="rounded-[24px] bg-[var(--surface-secondary)] p-4 sm:min-w-[150px]">
            <p className="m-0 text-xs text-[var(--muted)]">{t("analytics.topCategory")}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)]" style={{ color: topItem.color }}>
                {topItem.emoji && !isBuiltinCategory(topItem.category) ? (
                  <span className="text-xl leading-none">{topItem.emoji}</span>
                ) : TopIcon ? (
                  <TopIcon className="h-5 w-5" />
                ) : (
                  <span className="text-xl leading-none">{topItem.emoji}</span>
                )}
              </span>
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-semibold text-[var(--foreground)]">{topItem.label}</p>
                <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
                  {t("analytics.ofTotal", { pct: formatPercent(topItem.percent) })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="finance-analytics-breakdown" aria-labelledby="analytics-breakdown-title">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p id="analytics-breakdown-title" className="m-0 text-sm font-semibold text-[var(--foreground)]">
                {t("analytics.chartTitle")}
              </p>
              <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--muted)]">{t("analytics.howToReadTitle")}</p>
            </div>
            <Chip className="shrink-0" color="accent" size="sm" variant="primary">
              {t("history.count", { count: transactionCount })}
            </Chip>
          </div>

          <div className="mt-4 space-y-3">
            {chartItems.map((item) => {
              const Icon = item.Icon;
              const showEmoji = item.emoji && !isBuiltinCategory(item.category);

              return (
                <div key={item.category} className="finance-analytics-category">
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)]" style={{ color: item.color }}>
                      {showEmoji ? (
                        <span className="text-xl leading-none">{item.emoji}</span>
                      ) : Icon ? (
                        <Icon className="h-5 w-5" />
                      ) : (
                        <span className="text-xl leading-none">{item.emoji}</span>
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-semibold text-[var(--foreground)]">{item.label}</p>
                      <p className="m-0 mt-1 text-xs text-[var(--muted)]">{t("analytics.transactions", { count: item.count })}</p>
                      {item.limit > 0 ? (
                        <p
                          className={`m-0 mt-1 text-xs font-medium ${
                            item.overLimit ? "text-[var(--danger)]" : "text-[var(--muted)]"
                          }`}
                        >
                          {item.overLimit
                            ? t("limits.over") + " · "
                            : null}
                          {formatMoney(item.total)} / {formatMoney(item.limit)} ({item.limitPercent}%)
                        </p>
                      ) : null}
                    </div>

                    <div className="min-w-0 text-right">
                      <p className="m-0 whitespace-nowrap text-sm font-semibold text-[var(--foreground)]">{formatPercent(item.percent)}%</p>
                      <p className="m-0 mt-1 max-w-[11ch] truncate text-xs text-[var(--muted)]">{formatMoney(item.total)}</p>
                    </div>
                  </div>

                  <div
                    aria-label={item.label}
                    aria-valuemax={100}
                    aria-valuemin={0}
                    aria-valuenow={item.percent}
                    className="finance-analytics-bar"
                    role="meter"
                  >
                    <span
                      className="finance-analytics-bar-fill"
                      style={{
                        "--category-color": item.color,
                        width: `${Math.max(item.percent, 2)}%`,
                      } as CSSProperties & Record<"--category-color", string>}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
