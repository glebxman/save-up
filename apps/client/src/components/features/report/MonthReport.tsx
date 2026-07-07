import { useTranslation } from "react-i18next";

import type { MonthReport as MonthReportData } from "@/types/finance";
import { Card, CardContent } from "@/components/ui";
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
        <div className="grid gap-2 sm:grid-cols-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-[24px] bg-[var(--surface-secondary)] px-4 py-4">
              <span className="text-sm text-[var(--muted)]">{stat.label}</span>
              <p className="m-0 mt-2 text-lg font-semibold tracking-[-0.04em] text-[var(--foreground)]">{stat.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
