import { useTranslation } from "react-i18next";

import { BanknotesIcon } from "@/components/layout/icons";
import { Button, Card, CardContent, ProgressBar } from "@/components/ui";
import { formatMoney } from "@/utils/format";

interface SavingsTileProps {
  savings: number;
  goal: number;
  onSetGoal: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}

/**
 * Compact savings panel with a single primary action ("Deposit") and a
 * popover-style overflow row for less-frequent operations. Keeps the same
 * surface area as DailyLimitTile so they pair side-by-side.
 */
export function SavingsTile({
  savings,
  goal,
  onSetGoal,
  onDeposit,
  onWithdraw,
}: SavingsTileProps) {
  const { t } = useTranslation();
  const progress = goal > 0 ? Math.min(100, Math.round((savings / goal) * 100)) : 0;

  return (
    <Card className="h-full" data-onboarding="savings" variant="default">
      <CardContent compact>
        <div className="flex items-center gap-1.5 text-[var(--muted)]">
          <BanknotesIcon className="h-3 w-3 shrink-0" />
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.16em]">
            {t("savings.caption")}
          </span>
        </div>

        <p className="m-0 mt-2 text-[1.5rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">
          {formatMoney(savings)}
        </p>

        {goal > 0 ? (
          <>
            <div className="mt-3">
              <ProgressBar aria-label={t("savings.caption")} color="accent" size="md" value={progress}>
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <p className="m-0 text-[0.6875rem] text-[var(--muted)]">
                {progress}% · {formatMoney(goal)}
              </p>
              <button
                className="text-[0.6875rem] font-semibold text-[var(--accent-text)] transition active:opacity-70"
                onClick={onSetGoal}
                type="button"
              >
                {t("savings.setGoal")}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-1.5 flex items-center justify-between">
            <p className="m-0 text-[0.6875rem] text-[var(--muted)]">
              {t("savings.description")}
            </p>
            <button
              className="shrink-0 text-[0.6875rem] font-semibold text-[var(--accent-text)] transition active:opacity-70"
              onClick={onSetGoal}
              type="button"
            >
              {t("savings.setGoal")}
            </button>
          </div>
        )}

        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <Button
            size="xs"
            onPress={onDeposit}
            variant="primary"
          >
            {t("savings.deposit")}
          </Button>
          <Button
            size="xs"
            onPress={onWithdraw}
            variant="secondary"
          >
            {t("savings.withdraw")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
