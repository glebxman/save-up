import { Button, Card, CardContent, ProgressBar } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { BanknotesIcon } from "@/components/layout/icons";
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
    <Card className="h-full overflow-hidden" variant="default">
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--accent)]">
              <BanknotesIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="m-0 text-sm text-[var(--muted)]">{t("savings.caption")}</p>
              <p className="m-0 mt-1 text-2xl font-semibold text-[var(--foreground)]">{formatMoney(savings)}</p>
            </div>
          </div>

          {goal > 0 && (
            <>
              <ProgressBar aria-label={t("savings.caption")} color="accent" size="lg" value={progress}>
                <ProgressBar.Track>
                  <ProgressBar.Fill />
                </ProgressBar.Track>
              </ProgressBar>
              <p className="m-0 text-xs text-[var(--muted)] mb-2">
                {t("savings.goalText", { goal: formatMoney(goal), remaining: formatMoney(remaining) })}
              </p>
            </>
          )}

          {goal === 0 && (
            <p className="m-0 text-xs text-[var(--muted)] mb-2">{t("savings.description")}</p>
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
