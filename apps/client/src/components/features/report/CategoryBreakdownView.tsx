import { TrophyIcon } from "@heroicons/react/24/solid";
import { Card, CardContent, Chip, ProgressBar } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { CategoryBreakdown } from "@/types/finance";
import { categoryMeta } from "@/components/features/shared/categoryMeta";
import { formatMoney } from "@/utils/format";

interface CategoryBreakdownViewProps {
  breakdown: CategoryBreakdown;
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
  const topPct = breakdown.expenseTotal > 0
    ? Number(((topCategory.total / breakdown.expenseTotal) * 100).toFixed(1))
    : 0;
  const TopIcon = categoryMeta[topCategory.category].icon;
  const topMeta = categoryMeta[topCategory.category];

  return (
    <Card variant="default">
      <CardContent>
        <div className="mb-4 grid gap-2 md:grid-cols-2">
          <Card variant="secondary">
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-xs text-[var(--muted)]">{t("analytics.title")}</p>
                  <p className="m-0 mt-1 text-lg font-semibold text-[var(--foreground)]">{t(`expenseCategory.${topCategory.category}`)}</p>
                  <p className="m-0 mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatMoney(topCategory.total)}</p>
                </div>
                <span className={`flex h-11 w-11 items-center justify-center rounded-full ${topMeta.bg} ${topMeta.color}`}>
                  <TopIcon className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <Chip color="accent" size="sm" variant="primary">
                  {t("analytics.ofTotal", { pct: topPct })}
                </Chip>
                <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                  <TrophyIcon className="h-4 w-4 text-[var(--accent)]" />
                  {t("analytics.transactions", { count: topCategory.count })}
                </span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2">
            <Card variant="secondary">
              <CardContent>
                <p className="m-0 text-xs text-[var(--muted)]">{t("analytics.totalExpenses")}</p>
                <p className="m-0 mt-1 text-lg font-semibold text-[var(--foreground)]">{formatMoney(breakdown.expenseTotal)}</p>
              </CardContent>
            </Card>
            <Card variant="secondary">
              <CardContent>
                <p className="m-0 text-xs text-[var(--muted)]">{t("monthReport.transactions")}</p>
                <p className="m-0 mt-1 text-lg font-semibold text-[var(--foreground)]">{transactionCount}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-2">
          {sorted.map((item) => {
            const meta = categoryMeta[item.category];
            const Icon = meta.icon;
            const pct = breakdown.expenseTotal > 0
              ? Number(((item.total / breakdown.expenseTotal) * 100).toFixed(1))
              : 0;

            return (
              <Card key={item.category} variant="secondary">
                <CardContent>
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${meta.bg}`}>
                      <Icon className={`h-5 w-5 ${meta.color}`} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-[var(--foreground)]">
                          {t(`expenseCategory.${item.category}`)}
                        </span>
                        <span className="text-sm font-semibold text-[var(--foreground)]">
                          {formatMoney(item.total)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar aria-label={t(`expenseCategory.${item.category}`)} color="accent" size="lg" value={Math.max(pct, 2)}>
                          <ProgressBar.Track>
                            <ProgressBar.Fill />
                          </ProgressBar.Track>
                        </ProgressBar>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
                        <span>{t("analytics.ofTotal", { pct })}</span>
                        <span>{t("analytics.transactions", { count: item.count })}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
