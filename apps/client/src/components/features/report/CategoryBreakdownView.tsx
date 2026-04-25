import type { CSSProperties } from "react";
import { TrophyIcon } from "@heroicons/react/24/solid";
import { useTranslation } from "react-i18next";

import type { CategoryBreakdown } from "@/types/finance";
import { categoryMeta } from "@/components/features/shared/categoryMeta";
import { Card, CardContent, Chip } from "@/components/ui";
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

function buildDonutBackground(items: CategoryBreakdown["items"], total: number): string {
  if (items.length === 0 || total <= 0) {
    return "var(--surface-tertiary)";
  }

  let cursor = 0;
  const slices = items.map((item, index) => {
    const start = cursor;
    const share = (item.total / total) * 100;
    const end = index === items.length - 1 ? 100 : cursor + share;

    cursor = end;

    return `${categoryMeta[item.category].chartColor} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
  });

  return `conic-gradient(${slices.join(", ")})`;
}

export function CategoryBreakdownView({ breakdown }: CategoryBreakdownViewProps) {
  const { t } = useTranslation();

  const sorted = [...breakdown.items].sort((a, b) => b.total - a.total);
  const transactionCount = sorted.reduce((sum, item) => sum + item.count, 0);

  if (sorted.length === 0) {
    return (
      <Card variant="secondary">
        <CardContent>
          <p className="py-4 text-center text-sm text-[var(--muted)]">{t("analytics.noData")}</p>
        </CardContent>
      </Card>
    );
  }

  const topCategory = sorted[0]!;
  const topPct = getPercent(topCategory.total, breakdown.expenseTotal);
  const TopIcon = categoryMeta[topCategory.category].icon;
  const topMeta = categoryMeta[topCategory.category];
  const donutStyle: CSSProperties = {
    background: buildDonutBackground(sorted, breakdown.expenseTotal),
  };

  return (
    <Card className="overflow-hidden" variant="default">
      <CardContent className="space-y-5">
        <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <p className="m-0 text-sm text-[var(--muted)]">{t("analytics.title")}</p>
            <h2 className="m-0 mt-1 break-words text-[2.35rem] font-semibold leading-none text-[var(--foreground)]">
              {formatMoney(breakdown.expenseTotal)}
            </h2>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-[var(--surface-secondary)] px-3 py-2 text-sm text-[var(--foreground)]">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${topMeta.bg}`}>
                  <TopIcon className={`h-4 w-4 ${topMeta.color}`} />
                </span>
                <span className="min-w-0 truncate font-semibold">{t(`expenseCategory.${topCategory.category}`)}</span>
              </span>
              <Chip color="accent" size="sm" variant="primary">
                {t("analytics.ofTotal", { pct: formatPercent(topPct) })}
              </Chip>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-3 py-2 text-xs text-[var(--muted)]">
                <TrophyIcon className="h-4 w-4 text-[var(--accent)]" />
                {t("analytics.transactions", { count: topCategory.count })}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <div className="rounded-[22px] bg-[var(--surface-secondary)] px-4 py-3">
                <p className="m-0 text-xs text-[var(--muted)]">{t(`expenseCategory.${topCategory.category}`)}</p>
                <p className="m-0 mt-1 break-words text-base font-semibold text-[var(--foreground)]">{formatMoney(topCategory.total)}</p>
              </div>
              <div className="rounded-[22px] bg-[var(--surface-secondary)] px-4 py-3">
                <p className="m-0 text-xs text-[var(--muted)]">{t("monthReport.transactions")}</p>
                <p className="m-0 mt-1 text-base font-semibold text-[var(--foreground)]">{transactionCount}</p>
              </div>
            </div>
          </div>

          <div
            aria-label={t("analytics.totalExpenses")}
            className="mx-auto flex h-44 w-44 shrink-0 items-center justify-center rounded-full p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
            role="img"
            style={donutStyle}
          >
            <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-4 text-center backdrop-blur-xl">
              <span className="text-xs text-[var(--muted)]">{t("analytics.totalExpenses")}</span>
              <strong className="mt-1 break-words text-[0.95rem] font-semibold leading-tight text-[var(--foreground)]">
                {formatMoney(breakdown.expenseTotal)}
              </strong>
            </div>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {sorted.slice(0, 3).map((item) => {
            const meta = categoryMeta[item.category];
            const Icon = meta.icon;
            const pct = getPercent(item.total, breakdown.expenseTotal);

            return (
              <div key={item.category} className="rounded-[24px] bg-[var(--surface-secondary)] p-4">
                <div className="flex items-center gap-2">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-semibold text-[var(--foreground)]">
                      {t(`expenseCategory.${item.category}`)}
                    </p>
                    <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
                      {t("analytics.ofTotal", { pct: formatPercent(pct) })}
                    </p>
                  </div>
                </div>
                <p className="m-0 mt-3 break-words text-base font-semibold text-[var(--foreground)]">{formatMoney(item.total)}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-3">
          {sorted.map((item) => {
            const meta = categoryMeta[item.category];
            const Icon = meta.icon;
            const pct = getPercent(item.total, breakdown.expenseTotal);

            return (
              <div key={item.category} className="rounded-[24px] bg-[var(--surface-secondary)] p-4">
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.bg}`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="m-0 truncate text-sm font-semibold text-[var(--foreground)]">
                          {t(`expenseCategory.${item.category}`)}
                        </p>
                        <p className="m-0 mt-1 text-xs text-[var(--muted)]">{t("analytics.transactions", { count: item.count })}</p>
                      </div>
                      <span className="max-w-[45%] break-words text-right text-sm font-semibold text-[var(--foreground)]">
                        {formatMoney(item.total)}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                      <div
                        aria-label={t(`expenseCategory.${item.category}`)}
                        aria-valuemax={100}
                        aria-valuemin={0}
                        aria-valuenow={pct}
                        className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--surface-tertiary)]"
                        role="meter"
                      >
                        <div
                          className="h-full rounded-full transition-[width] duration-300"
                          style={{
                            backgroundColor: meta.chartColor,
                            width: `${Math.max(pct, 2)}%`,
                          }}
                        />
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[var(--foreground)]">{formatPercent(pct)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
