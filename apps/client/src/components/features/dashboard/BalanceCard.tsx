import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { formatMoney } from "@/utils/format";

interface BalanceCardProps {
  balance: number;
  monthlyExp: number;
}

export function BalanceCard({ balance, monthlyExp }: BalanceCardProps) {
  const { t } = useTranslation();
  const statusLabel = balance >= monthlyExp ? t("balance.healthy") : t("balance.watch");
  const spendableNow = Math.max(balance - monthlyExp, 0);

  return (
    <Card className="overflow-hidden" variant="default">
      <CardHeader>
        <div className="flex w-full items-start justify-between gap-3">
          <div>
            <CardDescription>{t("balance.caption")}</CardDescription>
            <CardTitle>{formatMoney(balance)}</CardTitle>
            <p className="mb-0 mt-2 text-sm font-medium text-[var(--accent)]">{statusLabel}</p>
          </div>

          <Chip color="accent" variant="primary">
            {t("common.live")}
          </Chip>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-[26px] bg-black/5 p-4">
          <p className="mb-1 mt-0 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("balance.spendableNow")}</p>
          <strong className="text-2xl font-semibold text-[var(--foreground)]">{formatMoney(spendableNow)}</strong>
        </div>
      </CardContent>

      <CardFooter>
        <div className="grid w-full grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-black/5 p-3">
            <p className="mb-1 mt-0 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("balance.monthlyBudget")}</p>
            <strong className="text-base font-semibold text-[var(--foreground)]">{formatMoney(monthlyExp)}</strong>
          </div>

          <div className="rounded-[22px] bg-black/5 p-3">
            <p className="mb-1 mt-0 text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{t("balance.tracking")}</p>
            <strong className="text-base font-semibold text-[var(--foreground)]">{t("balance.trackingValue")}</strong>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
