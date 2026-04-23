import {
  AcademicCapIcon,
  BoltIcon,
  EllipsisHorizontalCircleIcon,
  HeartIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TrophyIcon,
  TruckIcon,
} from "@heroicons/react/24/solid";
import { Card, CardContent, Chip, ProgressBar } from "@heroui/react";
import type { ComponentType, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import type { CategoryBreakdown, ExpenseCategory } from "@/types/finance";
import { formatMoney } from "@/utils/format";

interface CategoryBreakdownViewProps {
  breakdown: CategoryBreakdown;
}

function FoodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
    </svg>
  );
}

const categoryMeta: Record<ExpenseCategory, { icon: ComponentType<SVGProps<SVGSVGElement>>; color: string; bg: string }> = {
  food: { icon: FoodIcon, color: "text-orange-500", bg: "bg-orange-100" },
  taxi: { icon: TruckIcon, color: "text-yellow-500", bg: "bg-yellow-100" },
  entertainment: { icon: SparklesIcon, color: "text-purple-500", bg: "bg-purple-100" },
  shopping: { icon: ShoppingBagIcon, color: "text-pink-500", bg: "bg-pink-100" },
  utilities: { icon: BoltIcon, color: "text-blue-500", bg: "bg-blue-100" },
  health: { icon: HeartIcon, color: "text-red-500", bg: "bg-red-100" },
  education: { icon: AcademicCapIcon, color: "text-teal-500", bg: "bg-teal-100" },
  other: { icon: EllipsisHorizontalCircleIcon, color: "text-gray-500", bg: "bg-gray-100" },
};

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
