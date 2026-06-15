import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { CategoryBreakdownView } from "@/components/features/report/CategoryBreakdownView";
import { DailyTrendChart } from "@/components/features/report/DailyTrendChart";
import { MonthReport } from "@/components/features/report/MonthReport";
import { TransactionHistoryView } from "@/components/features/report/TransactionHistoryView";
import { getCategoryDisplay, isBuiltinCategory } from "@/components/features/shared/categoryMeta";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Chip, ProgressBar, Skeleton } from "@/components/ui";
import { useFinance } from "@/hooks/useFinance";
import type { TransactionFilters } from "@/types/finance";
import { exportTransactionsToExcel } from "@/utils/export";
import { formatMoney } from "@/utils/format";
import * as api from "@/api/methods";
import { useTelegram } from "@/hooks/useTelegram";
import { useToastStore } from "@/stores/ui.store";

function getCurrentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

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

type ReportMode = "income" | "spending" | "analytics" | "history";

export function Report() {
  const { t } = useTranslation();
  const { initData } = useTelegram();
  const pushToast = useToastStore((s) => s.pushToast);
  const [selectedMonthKey, setSelectedMonthKey] = useState(getCurrentMonthKey());
  const [isExporting, setIsExporting] = useState(false);
  const { report, breakdown, dailyTrend, reportQuery, breakdownQuery, newMonthMutation, status } = useFinance({
    reportMonthKey: selectedMonthKey,
  });
  const customCategories = status?.user.customCategories ?? [];
  const customizations = status?.user.categoryCustomizations ?? {};
  const [mode, setMode] = useState<ReportMode>("income");
  const [historyFilters, setHistoryFilters] = useState<TransactionFilters>({
    monthKey: selectedMonthKey,
    type: "all",
    category: "all",
    search: "",
    includeDeleted: false,
  });
  const activeReport = report ?? {
    monthKey: "",
    incomeTotal: 0,
    expenseTotal: 0,
    savingsTotal: 0,
    savingsWithdrawnTotal: 0,
    netSavingsTotal: 0,
    transactionCount: 0,
  };

  useEffect(() => {
    setHistoryFilters((current) => ({
      ...current,
      monthKey: selectedMonthKey,
    }));
  }, [selectedMonthKey]);

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
            label: topBreakdownItems[0]
              ? getCategoryDisplay(topBreakdownItems[0].category, { customCategories, customizations, t }).name
              : t("analytics.title"),
            value: topBreakdownItems[0] ? formatMoney(topBreakdownItems[0].total) : "0",
          },
          {
            label: t("monthReport.transactions"),
            value: String(analyticsTransactionCount || activeReport.transactionCount),
          },
        ],
        rows: topBreakdownItems.map((item) => ({
          key: item.category,
          label: getCategoryDisplay(item.category, { customCategories, customizations, t }).name,
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
    customCategories,
    customizations,
    mode,
    t,
    topBreakdownItems,
  ]);

  async function handleExport(): Promise<void> {
    if (!initData) return;
    setIsExporting(true);
    try {
      const items = await api.getTransactions(initData, {
        monthKey: selectedMonthKey,
        includeDeleted: false,
        limit: 200,
      });
      if (items.length === 0) {
        pushToast({ tone: "info", message: t("export.empty", { defaultValue: "No transactions to export" }) });
        return;
      }
      const { base64Data, filename } = await exportTransactionsToExcel({
        monthKey: selectedMonthKey,
        transactions: items,
        customCategories,
        customizations,
        t,
      });

      // Local browser download
      try {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        console.error("Local download failed", err);
      }

      // Send to Telegram chat
      await api.sendExportToTelegram(initData, base64Data, filename);
      pushToast({ tone: "success", message: t("export.telegramSent", { defaultValue: "Report sent to your Telegram chat" }) });
    } catch (error) {
      console.error(error);
      pushToast({ tone: "error", message: t("feedback.genericError") });
    } finally {
      setIsExporting(false);
    }
  }

  if (reportQuery.isPending && !report) {
    return (
      <div className="space-y-4">
        <Card variant="default">
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Skeleton variant="text" className="h-3 w-20" />
                <Skeleton variant="text" className="h-9 w-40" />
              </div>
              <Skeleton className="h-[72px] w-full rounded-[20px] sm:w-44" />
            </div>
            <Skeleton className="h-11 w-full rounded-[22px]" />
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Skeleton variant="text" className="h-3 w-24" />
                <Skeleton variant="text" className="h-10 w-36" />
                <Skeleton variant="text" className="h-3 w-48" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20 rounded-[24px]" />
                <Skeleton className="h-20 rounded-[24px]" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton variant="text" className="h-3 w-24" />
                      <Skeleton variant="text" className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
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
        <CardHeader className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
          <div>
            <CardDescription>{t("report.statistics")}</CardDescription>
            <CardTitle className="mt-1 text-[2rem] tracking-normal">{activeReport.monthKey}</CardTitle>
          </div>

          <label
            className="grid gap-1.5 rounded-[20px] bg-[var(--surface-secondary)] px-3 py-2 text-xs text-[var(--muted)] sm:min-w-[10.5rem]"
            data-onboarding="report-month"
          >
            <span>{t("report.monthSelector")}</span>
            <input
              className="min-h-10 rounded-[16px] border border-[var(--field-border)] bg-[var(--field-background)] px-3 text-sm font-semibold text-[var(--field-foreground)] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)]"
              max={getCurrentMonthKey()}
              onChange={(event) => {
                if (event.target.value) {
                  setSelectedMonthKey(event.target.value);
                }
              }}
              type="month"
              value={selectedMonthKey}
            />
          </label>
        </CardHeader>

        <CardContent>
          <div className="relative flex rounded-[22px] bg-[var(--surface-secondary)] p-1" data-onboarding="report-tabs">
            <div
              className="absolute bottom-1 top-1 rounded-[18px] bg-[var(--accent)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                width: `calc((100% - 8px) / ${modes.length})`,
                transform: `translateX(calc(100% * ${modes.indexOf(mode)}))`,
              }}
            />
            {modes.map((m) => (
              <button
                key={m}
                className={`relative z-10 flex-1 rounded-[18px] px-3 py-2 text-xs transition-colors duration-300 ${
                  mode === m ? "font-semibold text-[var(--accent-foreground)]" : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
                onClick={() => setMode(m)}
              >
                {t(`report.mode${m.charAt(0).toUpperCase() + m.slice(1)}`)}
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-5" data-onboarding="report-summary">
            <div>
              <p className="mb-1 mt-0 text-sm text-[var(--muted)]">{summary.focusLabel}</p>
              <strong className="break-words text-[2.45rem] font-semibold leading-none tracking-normal text-[var(--foreground)]">{summary.focusValue}</strong>
              <p className="m-0 mt-2 max-w-[28ch] text-xs text-[var(--muted)]">{summary.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {summary.metrics.map((metric) => (
                <div key={metric.label} className="rounded-[24px] bg-[var(--surface-secondary)] px-4 py-4">
                  <p className="m-0 text-xs text-[var(--muted)]">{metric.label}</p>
                  <p className="m-0 mt-2 break-words text-lg font-semibold tracking-normal text-[var(--foreground)]">{metric.value}</p>
                </div>
              ))}
            </div>

            {mode === "analytics" && breakdownQuery.isPending && !breakdown && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton variant="text" className="h-3 w-24" />
                      <Skeleton variant="text" className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-3 rounded-full" />
                  </div>
                ))}
              </div>
            )}

            {summary.rows.length > 0 && (
              <div className="space-y-3">
                {summary.rows.map((row) => {
                  const rowColor = getCategoryDisplay(row.key, { customCategories, customizations }).chartColor;

                  return (
                    <div key={row.key} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-sm text-[var(--foreground)]">{row.label}</span>
                        <span className="max-w-[48%] break-words text-right text-sm font-semibold text-[var(--foreground)]">{formatMoney(row.value)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <ProgressBar aria-label={row.label} color="accent" size="lg" value={row.percent}>
                            <ProgressBar.Track>
                              <ProgressBar.Fill style={rowColor ? { backgroundColor: rowColor } : undefined} />
                            </ProgressBar.Track>
                          </ProgressBar>
                        </div>
                        <Chip color="accent" size="sm" variant="primary">
                          {row.percent}%
                        </Chip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div data-onboarding="report-details">
        {mode === "history" ? (
          <TransactionHistoryView filters={historyFilters} hideMonthFilter onFiltersChange={setHistoryFilters} />
        ) : mode === "analytics" && breakdown && breakdown.items.length > 0 ? (
          <div className="space-y-4">
            <CategoryBreakdownView breakdown={breakdown} />
            {dailyTrend ? <div data-onboarding="report-heatmap"><DailyTrendChart trend={dailyTrend} /></div> : null}
          </div>
        ) : mode === "analytics" && !breakdownQuery.isPending ? (
          <Card variant="secondary">
            <CardContent>
              <p className="py-4 text-center text-sm text-[var(--muted)]">{t("analytics.noData")}</p>
            </CardContent>
          </Card>
        ) : mode !== "analytics" ? (
          <MonthReport report={activeReport} />
        ) : null}
      </div>

      <div data-onboarding="report-new-month">
        <Card variant="default">
          <CardContent>
            <p className="m-0 mb-2 text-sm text-[var(--muted)]">{t("report.newMonthCaption")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                fullWidth
                isDisabled={isExporting || !initData || activeReport.transactionCount === 0}
                onPress={() => void handleExport()}
                variant="secondary"
              >
                {isExporting
                  ? t("export.exporting", { defaultValue: "Exporting..." })
                  : t("export.action", { defaultValue: "Export to Excel" })}
              </Button>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
