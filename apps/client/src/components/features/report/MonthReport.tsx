import { Card, CardContent } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { MonthReport as MonthReportData } from "@/types/finance";
import { formatMoney } from "@/utils/format";

interface MonthReportProps {
  report: MonthReportData;
}

export function MonthReport({ report }: MonthReportProps) {
  const { t } = useTranslation();

  const stats = [
    { label: t("monthReport.income"), value: formatMoney(report.incomeTotal) },
    { label: t("monthReport.spending"), value: formatMoney(report.expenseTotal) },
    { label: t("monthReport.saved"), value: formatMoney(report.savingsTotal) },
    { label: t("monthReport.withdrawn"), value: formatMoney(report.savingsWithdrawnTotal) },
    { label: t("monthReport.netSaved"), value: formatMoney(report.netSavingsTotal) },
    { label: t("monthReport.transactions"), value: String(report.transactionCount) },
  ];

  return (
    <Card variant="default">
      <CardContent>
        <div className="divide-y divide-[var(--separator)]">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className="text-sm text-[var(--muted)]">{stat.label}</span>
              <span className="text-sm font-semibold text-[var(--foreground)]">{stat.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
