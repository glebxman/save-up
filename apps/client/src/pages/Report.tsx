import { useMemo, useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Chip, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { MonthReport } from "@/components/features/report/MonthReport";
import { ReportIcon } from "@/components/layout/icons";
import { useFinance } from "@/hooks/useFinance";
import { formatMoney } from "@/utils/format";

type ReportMode = "income" | "spending";

function buildSnapshotBars(incomeTotal: number, expenseTotal: number, savingsTotal: number, mode: ReportMode): number[] {
  const raw = mode === "income"
    ? [incomeTotal * 0.22, savingsTotal * 0.8, incomeTotal * 0.48, incomeTotal, incomeTotal * 0.72, savingsTotal * 1.2]
    : [expenseTotal * 0.2, expenseTotal * 0.42, expenseTotal * 0.56, expenseTotal, expenseTotal * 0.76, expenseTotal * 0.34];

  const max = Math.max(...raw, 1);

  return raw.map((value) => Math.max(18, Math.round((value / max) * 100)));
}

export function Report() {
  const { t } = useTranslation();
  const { report, reportQuery, newMonthMutation } = useFinance();
  const [mode, setMode] = useState<ReportMode>("income");

  const selectedTotal = mode === "income" ? report?.incomeTotal ?? 0 : report?.expenseTotal ?? 0;
  const snapshotBars = useMemo(() => {
    if (!report) {
      return [];
    }

    return buildSnapshotBars(report.incomeTotal, report.expenseTotal, report.savingsTotal, mode);
  }, [mode, report]);

  if (reportQuery.isPending && !report) {
    return (
      <Card variant="secondary">
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
      <Card variant="secondary">
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
      <Card className="overflow-hidden" variant="tertiary">
        <CardHeader>
          <div className="flex w-full items-center justify-between gap-3">
            <div>
              <CardDescription>{t("report.statistics")}</CardDescription>
              <CardTitle>{report.monthKey}</CardTitle>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(190,255,102,0.14)] text-[var(--accent)]">
              <ReportIcon className="h-5 w-5" />
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button onPress={() => setMode("income")} variant={mode === "income" ? "primary" : "secondary"}>
              {t("report.modeIncome")}
            </Button>
            <Button onPress={() => setMode("spending")} variant={mode === "spending" ? "primary" : "secondary"}>
              {t("report.modeSpending")}
            </Button>
          </div>

          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="mb-1 mt-0 text-sm text-[var(--muted)]">
                {mode === "income" ? t("report.totalIncome") : t("report.totalSpending")}
              </p>
              <strong className="text-4xl font-semibold text-[var(--foreground)]">{formatMoney(selectedTotal)}</strong>
            </div>

            <Chip color="accent" variant="soft">
              {t("report.ops", { count: report.transactionCount })}
            </Chip>
          </div>

          <div className="mt-6">
            <div className="finance-chart-grid">
              {snapshotBars.map((height, index) => (
                <div key={`${mode}-${index}`} className="finance-chart-column">
                  <div
                    className={`finance-chart-bar ${index === 3 ? "finance-chart-bar--accent" : ""}`}
                    style={{ height: `${height}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <MonthReport report={report} />

      <Card variant="default">
        <CardHeader>
          <div>
            <CardDescription>{t("report.newMonthCaption")}</CardDescription>
            <CardTitle>{t("report.newMonthTitle")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
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
