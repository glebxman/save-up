import { Card, CardContent } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { WalletIcon } from "@/components/layout/icons";
import { formatMoney } from "@/utils/format";

interface BalanceCardProps {
  balance: number;
  monthlyExp: number;
}

export function BalanceCard({ balance, monthlyExp }: BalanceCardProps) {
  const { t } = useTranslation();
  const isHealthy = balance >= monthlyExp;
  const spendableNow = Math.max(balance - monthlyExp, 0);

  return (
    <Card className="overflow-hidden" variant="default">
      <CardContent>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)]">
              <WalletIcon className="h-6 w-6" />
            </span>
            <div>
              <p className="m-0 text-sm text-[var(--muted)]">{t("balance.caption")}</p>
              <p className="m-0 mt-1 text-3xl font-semibold text-[var(--foreground)]">{formatMoney(balance)}</p>
              <p className={`m-0 mt-1 text-sm font-medium ${isHealthy ? "text-[var(--accent)]" : "text-[var(--warning)]"}`}>
                {isHealthy ? t("balance.healthy") : t("balance.watch")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="m-0 text-xs uppercase tracking-wider text-[var(--muted)]">{t("balance.spendableNow")}</p>
            <p className="m-0 mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatMoney(spendableNow)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
