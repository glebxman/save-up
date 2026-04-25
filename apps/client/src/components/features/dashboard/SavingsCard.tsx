import { useTranslation } from "react-i18next";

import { BanknotesIcon } from "@/components/layout/icons";
import { Button, Card, CardContent, ProgressBar } from "@/components/ui";
import { formatMoney } from "@/utils/format";

interface SavingsCardProps {
  savings: number;
  goal: number;
  onSetGoal: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
}

export function SavingsCard({ savings, goal, onSetGoal, onDeposit, onWithdraw }: SavingsCardProps) {
  const { t } = useTranslation();
  const progress = goal > 0 ? Math.min(100, Math.round((savings / goal) * 100)) : 0;
  const remaining = Math.max(goal - savings, 0);

  return (
    <Card className="h-full overflow-hidden" data-onboarding="savings" variant="default">
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="m-0 text-sm text-[var(--muted)]">{t("savings.caption")}</p>
              <p className="m-0 mt-1 text-2xl font-semibold tracking-[-0.05em] text-[var(--foreground)]">{formatMoney(savings)}</p>
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--foreground)]">
              <BanknotesIcon className="h-5 w-5" />
            </span>
          </div>

          {goal > 0 && (
            <>
              <ProgressBar aria-label={t("savings.caption")} color="accent" size="lg" value={progress}>
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
              <p className="m-0 mb-2 text-xs text-[var(--muted)]">
                {t("savings.goalText", { goal: formatMoney(goal), remaining: formatMoney(remaining) })}
              </p>
            </>
          )}

          {goal === 0 && (
            <p className="m-0 text-xs text-[var(--muted)]">{t("savings.description")}</p>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Button className="w-full" onPress={onDeposit} size="sm" variant="secondary">
              {t("savings.deposit")}
            </Button>
            <Button className="w-full" onPress={onWithdraw} size="sm" variant="secondary">
              {t("savings.withdraw")}
            </Button>
            <Button className="w-full" onPress={onSetGoal} size="sm" variant="secondary">
              {t("savings.setGoal")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
