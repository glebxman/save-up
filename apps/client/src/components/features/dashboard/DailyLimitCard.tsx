import { Card, CardContent, ProgressBar } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { ClockIcon } from "@/components/layout/icons";
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
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)]">
              <ClockIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="m-0 text-sm text-[var(--muted)]">{t("dailyLimit.caption")}</p>
              <p className="m-0 mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatMoney(dailyLimit)}</p>
            </div>
          </div>
          <ProgressBar aria-label={t("dailyLimit.caption")} color="accent" size="lg" value={getRunwayProgress(daysRemaining)}>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <p className="m-0 text-xs text-[var(--muted)]">
            {t("dailyLimit.days", { count: daysRemaining })} &middot; {t("dailyLimit.description")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
