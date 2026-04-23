import { useMemo, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Chip, ProgressBar, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { CategoryBreakdownView } from "@/components/features/report/CategoryBreakdownView";
import { MonthReport } from "@/components/features/report/MonthReport";
import { TransactionHistoryView } from "@/components/features/report/TransactionHistoryView";
import { useFinance } from "@/hooks/useFinance";
import { formatMoney } from "@/utils/format";

type ReportMode = "income" | "spending" | "analytics" | "history";

interface SummaryMetric {
  label: string;
  value: string;
}

interface SummaryRow {
  key: string;
  label: string;
  value: number;
  percent: number;
}

interface ReportSummary {
  focusLabel: string;
  focusValue: string;
  description: string;
  metrics: SummaryMetric[];
  rows: SummaryRow[];
}

const modes: ReportMode[] = ["income", "spending", "analytics", "history"];

function getProgressValue(value: number, total: number): number {
  if (value <= 0 || total <= 0) {
    return 0;
  }

  return Math.max(6, Math.min(100, Math.round((value / total) * 100)));
}

export function Report() {
  const { t } = useTranslation();
  const { report, breakdown, reportQuery, breakdownQuery, newMonthMutation } = useFinance();
  const [mode, setMode] = useState<ReportMode>("income");
  const activeReport = report ?? {
    monthKey: "",
    incomeTotal: 0,
    expenseTotal: 0,
    savingsTotal: 0,
    savingsWithdrawnTotal: 0,
    netSavingsTotal: 0,
    transactionCount: 0,
  };

  const topBreakdownItems = useMemo(
    () => [...(breakdown?.items ?? [])].sort((a, b) => b.total - a.total).slice(0, 3),
    [breakdown],
  );

  const analyticsTransactionCount = useMemo(
    () => topBreakdownItems.reduce((sum, item) => sum + item.count, 0),
    [topBreakdownItems],
  );

  const comparisonBase = activeReport.incomeTotal > 0
    ? activeReport.incomeTotal
    : Math.max(activeReport.expenseTotal, activeReport.savingsTotal, activeReport.savingsWithdrawnTotal, 1);

  const cashflowRows = useMemo<SummaryRow[]>(
    () => [
      {
        key: "income",
        label: t("monthReport.income"),
        value: activeReport.incomeTotal,
        percent: getProgressValue(activeReport.incomeTotal, comparisonBase),
      },
      {
        key: "spending",
        label: t("monthReport.spending"),
        value: activeReport.expenseTotal,
        percent: getProgressValue(activeReport.expenseTotal, comparisonBase),
      },
      {
        key: "saved",
        label: t("monthReport.saved"),
        value: activeReport.savingsTotal,
        percent: getProgressValue(activeReport.savingsTotal, comparisonBase),
      },
    ],
    [activeReport.expenseTotal, activeReport.incomeTotal, activeReport.savingsTotal, comparisonBase, t],
  );

  const summary = useMemo<ReportSummary>(() => {
    if (mode === "analytics") {
      const isAnalyticsLoading = breakdownQuery.isPending && !breakdown;

      return {
        focusLabel: t("analytics.totalExpenses"),
        focusValue: formatMoney(activeReport.expenseTotal),
        description: isAnalyticsLoading
          ? t("report.loading")
          : topBreakdownItems.length > 0
            ? t("analytics.description")
            : t("analytics.noData"),
        metrics: [
          {
            label: topBreakdownItems[0] ? t(`expenseCategory.${topBreakdownItems[0].category}`) : t("analytics.title"),
            value: topBreakdownItems[0] ? formatMoney(topBreakdownItems[0].total) : "0",
          },
          {
            label: t("monthReport.transactions"),
            value: String(analyticsTransactionCount || activeReport.transactionCount),
          },
        ],
        rows: topBreakdownItems.map((item) => ({
          key: item.category,
          label: t(`expenseCategory.${item.category}`),
          value: item.total,
          percent: getProgressValue(item.total, breakdown?.expenseTotal ?? 0),
        })),
      };
    }

    if (mode === "history") {
      return {
        focusLabel: t("monthReport.transactions"),
        focusValue: String(activeReport.transactionCount),
        description: t("history.count", { count: activeReport.transactionCount }),
        metrics: [
          { label: t("report.totalIncome"), value: formatMoney(activeReport.incomeTotal) },
          { label: t("report.totalSpending"), value: formatMoney(activeReport.expenseTotal) },
        ],
        rows: [],
      };
    }

    if (mode === "spending") {
      return {
        focusLabel: t("report.totalSpending"),
        focusValue: formatMoney(activeReport.expenseTotal),
        description: t("monthReport.description"),
        metrics: [
          { label: t("report.totalIncome"), value: formatMoney(activeReport.incomeTotal) },
          { label: t("monthReport.netSaved"), value: formatMoney(activeReport.netSavingsTotal) },
        ],
        rows: cashflowRows,
      };
    }

    return {
      focusLabel: t("report.totalIncome"),
      focusValue: formatMoney(activeReport.incomeTotal),
      description: t("monthReport.description"),
      metrics: [
        { label: t("monthReport.saved"), value: formatMoney(activeReport.savingsTotal) },
        { label: t("monthReport.transactions"), value: String(activeReport.transactionCount) },
      ],
      rows: cashflowRows,
    };
  }, [
    activeReport.expenseTotal,
    activeReport.incomeTotal,
    activeReport.netSavingsTotal,
    activeReport.savingsTotal,
    activeReport.transactionCount,
    analyticsTransactionCount,
    breakdown?.expenseTotal,
    breakdownQuery.isPending,
    cashflowRows,
    mode,
    t,
    topBreakdownItems,
  ]);

  if (reportQuery.isPending && !report) {
    return (
      <Card variant="default">
        <CardContent>
          <div className="flex items-center gap-3 py-3">
            <Spinner />
            <span>{t("report.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (reportQuery.isError || !report) {
    return (
      <Card variant="default">
        <CardHeader>
          <div>
            <CardDescription>{t("report.errorCaption")}</CardDescription>
            <CardTitle>{t("report.errorTitle")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="m-0 text-sm text-[var(--muted)]">{t("report.errorDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden" variant="default">
        <CardHeader>
          <div>
            <CardDescription>{t("report.statistics")}</CardDescription>
            <CardTitle>{activeReport.monthKey}</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex bg-[var(--surface-secondary)] p-1 rounded-xl">
            {modes.map((m) => (
              <button
                key={m}
                className={`flex-1 h-8 text-xs rounded-lg px-3 transition-colors ${
                  mode === m ? "bg-[var(--surface)] font-semibold" : ""
                }`}
                onClick={() => setMode(m)}
              >
                {t(`report.mode${m.charAt(0).toUpperCase() + m.slice(1)}`)}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <p className="mb-1 mt-0 text-sm text-[var(--muted)]">{summary.focusLabel}</p>
              <strong className="text-3xl font-semibold text-[var(--foreground)]">{summary.focusValue}</strong>
              <p className="m-0 mt-2 text-xs text-[var(--muted)]">{summary.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {summary.metrics.map((metric) => (
                <Card key={metric.label} variant="secondary">
                  <CardContent>
                    <p className="m-0 text-xs text-[var(--muted)]">{metric.label}</p>
                    <p className="m-0 mt-1 text-lg font-semibold text-[var(--foreground)]">{metric.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {mode === "analytics" && breakdownQuery.isPending && !breakdown && (
              <div className="flex items-center gap-3 py-2 text-sm text-[var(--muted)]">
                <Spinner />
                <span>{t("report.loading")}</span>
              </div>
            )}

            {summary.rows.length > 0 && (
              <div className="space-y-3">
                {summary.rows.map((row) => (
                  <div key={row.key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-[var(--foreground)]">{row.label}</span>
                      <span className="text-sm font-semibold text-[var(--foreground)]">{formatMoney(row.value)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <ProgressBar aria-label={row.label} color="accent" size="lg" value={row.percent}>
                          <ProgressBar.Track>
                            <ProgressBar.Fill />
                          </ProgressBar.Track>
                        </ProgressBar>
                      </div>
                      <Chip color="accent" size="sm" variant="primary">
                        {row.percent}%
                      </Chip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {mode === "history" ? (
        <TransactionHistoryView />
      ) : mode === "analytics" && breakdown ? (
        <CategoryBreakdownView breakdown={breakdown} />
      ) : mode !== "analytics" ? (
        <MonthReport report={activeReport} />
      ) : null}

      <Card variant="default">
        <CardContent>
          <p className="m-0 mb-2 text-sm text-[var(--muted)]">{t("report.newMonthCaption")}</p>
          <Button
            fullWidth
            isDisabled={newMonthMutation.isPending}
            onPress={() => {
              void newMonthMutation.mutateAsync();
            }}
            variant="danger-soft"
          >
            {t("report.newMonthAction")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
