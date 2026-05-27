import { useTranslation } from "react-i18next";

import { ClockIcon } from "@/components/layout/icons";
import { Card, CardContent, ProgressBar } from "@/components/ui";
import { formatMoney } from "@/utils/format";

interface DailyLimitTileProps {
  daysRemaining: number;
  dailyLimit: number;
}

function getRunwayProgress(daysRemaining: number): number {
  return Math.max(8, Math.min(100, Math.round((daysRemaining / 31) * 100)));
}

/**
 * Compact replacement for the legacy DailyLimitCard. We collapse the icon row
 * and the description into a single tight stack so two of these can sit
 * side-by-side on the dashboard without overflowing.
 */
export function DailyLimitTile({ daysRemaining, dailyLimit }: DailyLimitTileProps) {
  const { t } = useTranslation();

  return (
    <Card className="h-full" data-onboarding="daily-limit" variant="default">
      <CardContent className="!p-4">
        <div className="flex items-center gap-1.5 text-[var(--muted)]">
          <ClockIcon className="h-3 w-3 shrink-0" />
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em]">
            {t("dailyLimit.budgetCaption")}
          </span>
        </div>

        <p className="m-0 mt-2 text-[1.5rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">
          {formatMoney(dailyLimit)}
        </p>

        <div className="mt-3">
          <ProgressBar
            aria-label={t("dailyLimit.caption")}
            color="accent"
            size="md"
            value={getRunwayProgress(daysRemaining)}
          >
            <ProgressBar.Track>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>
        </div>

        <p className="m-0 mt-1.5 text-[11px] text-[var(--muted)]">
          {t("dailyLimit.days", { count: daysRemaining })}
        </p>
      </CardContent>
    </Card>
  );
}
