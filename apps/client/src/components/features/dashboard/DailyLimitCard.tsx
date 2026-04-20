import { Card, CardContent, CardDescription, CardHeader, CardTitle, Chip, ProgressBar } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { formatMoney } from "@/utils/format";

interface DailyLimitCardProps {
  daysRemaining: number;
  dailyLimit: number;
}

function getRunwayProgress(daysRemaining: number): number {
  return Math.max(8, Math.min(100, Math.round((daysRemaining / 31) * 100)));
}

export function DailyLimitCard({ daysRemaining, dailyLimit }: DailyLimitCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="h-full overflow-hidden" variant="default">
      <CardHeader>
        <div className="flex w-full items-start justify-between gap-3">
          <div>
            <CardDescription>{t("dailyLimit.caption")}</CardDescription>
            <CardTitle>{formatMoney(dailyLimit)}</CardTitle>
          </div>

          <Chip color="accent" variant="primary">
            {t("dailyLimit.days", { count: daysRemaining })}
          </Chip>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          <ProgressBar aria-label={t("dailyLimit.caption")} color="accent" value={getRunwayProgress(daysRemaining)} />
          <p className="m-0 text-sm text-[var(--muted)]">{t("dailyLimit.description")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
