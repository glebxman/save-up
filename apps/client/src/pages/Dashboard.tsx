import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { BalanceCard } from "@/components/features/dashboard/BalanceCard";
import { DailyLimitCard } from "@/components/features/dashboard/DailyLimitCard";
import { SavingsCard } from "@/components/features/dashboard/SavingsCard";
import { AmountInput } from "@/components/features/input/AmountInput";
import { SavingsModal } from "@/components/features/input/SavingsModal";
import { ArrowDownLeftIcon, ArrowUpRightIcon, ReportIcon, SettingsIcon } from "@/components/layout/icons";
import { useFinance } from "@/hooks/useFinance";

interface ShortcutButtonProps {
  icon: typeof ArrowUpRightIcon;
  label: string;
  onPress: () => void;
  isDisabled?: boolean;
}

function ShortcutButton({ icon: Icon, label, onPress, isDisabled }: ShortcutButtonProps) {
  return (
    <button
      className="flex h-[88px] w-full flex-col items-center justify-center gap-2 rounded-3xl bg-[var(--surface)] px-2 py-3 text-xs font-medium transition-colors active:bg-[var(--surface-secondary)] disabled:opacity-40"
      disabled={isDisabled}
      onClick={onPress}
      type="button"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(190,255,102,0.12)] text-[var(--accent)]">
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-[var(--foreground)]">{label}</span>
    </button>
  );
}

export function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { status, statusQuery, addExpenseMutation, addIncomeMutation } = useFinance();

  const parsedAmount = Number(amount);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isBusy = addExpenseMutation.isPending || addIncomeMutation.isPending;

  async function handleExpense(): Promise<void> {
    if (!hasValidAmount) {
      return;
    }

    await addExpenseMutation.mutateAsync({ amount: parsedAmount });
    setAmount("");
  }

  async function handleIncome(savingsPct: 10 | 20 | 30): Promise<void> {
    if (!hasValidAmount) {
      return;
    }

    await addIncomeMutation.mutateAsync({ amount: parsedAmount, savingsPct });
    setAmount("");
    setIsModalOpen(false);
  }

  if (statusQuery.isPending && !status) {
    return (
      <Card variant="default">
        <CardContent>
          <div className="flex items-center gap-3 py-3">
            <Spinner />
            <span>{t("dashboard.loading")}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (statusQuery.isError || !status) {
    return (
      <Card variant="default">
        <CardHeader>
          <div>
            <CardDescription>{t("dashboard.errorCaption")}</CardDescription>
            <CardTitle>{t("dashboard.errorTitle")}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="m-0 text-sm text-[var(--muted)]">{t("dashboard.errorDescription")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <BalanceCard balance={status.user.balance} monthlyExp={status.user.monthlyExp} />

      <AmountInput onChange={setAmount} value={amount} />

      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-3">
        <ShortcutButton
          icon={ArrowUpRightIcon}
          isDisabled={!hasValidAmount || isBusy}
          label={t("dashboard.shortcuts.income")}
          onPress={() => setIsModalOpen(true)}
        />
        <ShortcutButton
          icon={ArrowDownLeftIcon}
          isDisabled={!hasValidAmount || isBusy}
          label={t("dashboard.shortcuts.expense")}
          onPress={() => {
            void handleExpense();
          }}
        />
        <ShortcutButton icon={ReportIcon} label={t("dashboard.shortcuts.report")} onPress={() => navigate("/report")} />
        <ShortcutButton icon={SettingsIcon} label={t("dashboard.shortcuts.setting")} onPress={() => navigate("/settings")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DailyLimitCard
          dailyLimit={status.dailyLimit.dailyLimit}
          daysRemaining={status.dailyLimit.daysRemaining}
        />
        <SavingsCard savings={status.user.savings} savingsPct={status.user.savingsPct} />
      </div>

      <SavingsModal
        isOpen={isModalOpen}
        isPending={addIncomeMutation.isPending}
        onClose={() => setIsModalOpen(false)}
        onSelect={(value) => {
          void handleIncome(value);
        }}
      />
    </div>
  );
}
