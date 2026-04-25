import { useTranslation } from "react-i18next";

import { ClockIcon } from "@/components/layout/icons";
import { Card, CardContent, ProgressBar } from "@/components/ui";
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
    <Card className="h-full overflow-hidden" data-onboarding="daily-limit" variant="default">
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-sm text-[var(--muted)]">{t("dailyLimit.caption")}</p>
              <p className="m-0 mt-1 text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{formatMoney(dailyLimit)}</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)]">
              <ClockIcon className="h-5 w-5" />
            </span>
          </div>
          <ProgressBar aria-label={t("dailyLimit.caption")} color="accent" size="lg" value={getRunwayProgress(daysRemaining)}>
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-[var(--muted)]">{t("dailyLimit.days", { count: daysRemaining })}</span>
            <span className="text-[var(--muted)]">{t("dailyLimit.description")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
