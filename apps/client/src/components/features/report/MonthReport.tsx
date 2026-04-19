import { Card, CardContent, CardDescription, CardHeader, CardTitle, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { MonthReport as MonthReportData } from "@/types/finance";
import { formatMoney } from "@/utils/format";

interface MonthReportProps {
  report: MonthReportData;
}

export function MonthReport({ report }: MonthReportProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-3">
      <Card variant="secondary">
        <CardHeader>
          <div className="flex w-full items-start justify-between gap-3">
            <div>
              <CardDescription>{t("monthReport.snapshot")}</CardDescription>
              <CardTitle>{t("monthReport.overview")}</CardTitle>
            </div>

            <Chip color="accent" variant="soft">
              {report.monthKey}
            </Chip>
          </div>
        </CardHeader>

        <CardContent>
          <p className="m-0 text-sm text-[var(--muted)]">{t("monthReport.description")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="overflow-hidden" variant="tertiary">
          <CardHeader>
            <CardDescription>{t("monthReport.income")}</CardDescription>
            <CardTitle>{formatMoney(report.incomeTotal)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="overflow-hidden" variant="tertiary">
          <CardHeader>
            <CardDescription>{t("monthReport.spending")}</CardDescription>
            <CardTitle>{formatMoney(report.expenseTotal)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="overflow-hidden" variant="default">
          <CardHeader>
            <CardDescription>{t("monthReport.saved")}</CardDescription>
            <CardTitle>{formatMoney(report.savingsTotal)}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="overflow-hidden" variant="default">
          <CardHeader>
            <CardDescription>{t("monthReport.transactions")}</CardDescription>
            <CardTitle>{report.transactionCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
