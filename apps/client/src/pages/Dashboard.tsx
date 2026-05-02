import { useState } from "react";

import { useTranslation } from "react-i18next";

import { BalanceCard } from "@/components/features/dashboard/BalanceCard";
import { DailyLimitCard } from "@/components/features/dashboard/DailyLimitCard";
import { RecurringTemplateModal } from "@/components/features/dashboard/RecurringTemplateModal";
import { RecurringTemplatesCard } from "@/components/features/dashboard/RecurringTemplatesCard";
import { SavingsCard } from "@/components/features/dashboard/SavingsCard";
import { ExpenseCategoryModal } from "@/components/features/input/ExpenseCategoryModal";
import { AmountInput } from "@/components/features/input/AmountInput";
import { SavingsModal } from "@/components/features/input/SavingsModal";
import { AmountActionModal } from "@/components/features/shared/AmountActionModal";
import { ConfirmActionModal } from "@/components/features/shared/ConfirmActionModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@/components/ui";
import { PullToRefresh } from "@/components/shared/PullToRefresh";

import { useFinance } from "@/hooks/useFinance";
import { useTelegram } from "@/hooks/useTelegram";
import { useCurrency } from "@/hooks/useCurrency";
import { getConversionRate } from "@/utils/exchange-rates";
import type { ExpenseCategory, RecurringTransaction } from "@/types/finance";
import { formatMoney } from "@/utils/format";
import { MAX_FINANCE_AMOUNT, type CurrencyCode } from "@finance-twa/shared-types";

export function Dashboard() {
  const { t } = useTranslation();
  const { initData } = useTelegram();
  const [amount, setAmount] = useState("");
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTransaction | null>(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<RecurringTransaction | null>(null);
  const { currency: baseCurrency } = useCurrency();
  const [inputCurrency, setInputCurrency] = useState<CurrencyCode>(baseCurrency);

  const {
    status,
    statusQuery,
    addExpenseMutation,
    addIncomeMutation,
    transferSavingsMutation,
    updateSavingsGoalMutation,
    updateBalanceMutation,
    saveRecurringTransactionMutation,
    deleteRecurringTransactionMutation,
    applyRecurringTransactionMutation,
  } = useFinance();

  const parsedAmount = Number(amount);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 && parsedAmount <= MAX_FINANCE_AMOUNT;
  const amountHelperText = amount.trim().length > 0 && Number.isFinite(parsedAmount) && parsedAmount > MAX_FINANCE_AMOUNT
    ? t("amountInput.maxAmount", { amount: formatMoney(MAX_FINANCE_AMOUNT) })
    : undefined;
  const errorDetail = !initData
    ? t("dashboard.openInTelegram", {
      defaultValue: "Open this mini app inside Telegram so it can pass Telegram initData.",
    })
    : statusQuery.isError
      ? statusQuery.error.message
      : t("dashboard.errorDescription");
  const busyTemplateId = applyRecurringTransactionMutation.isPending
    ? (applyRecurringTransactionMutation.variables?.templateId ?? null)
    : deleteRecurringTransactionMutation.isPending
      ? (deleteRecurringTransactionMutation.variables?.templateId ?? null)
      : null;
  const isActionBusy = addExpenseMutation.isPending || addIncomeMutation.isPending;

  async function handleExpense(category: ExpenseCategory): Promise<void> {
    if (!hasValidAmount) {
      return;
    }

    const rate = getConversionRate(inputCurrency, baseCurrency);
    const convertedAmount = parsedAmount * rate;

    await addExpenseMutation.mutateAsync({ amount: convertedAmount, category });
    setAmount("");
    setIsExpenseModalOpen(false);
  }

  async function handleIncome(savingsAmt: number): Promise<void> {
    if (!hasValidAmount) {
      return;
    }

    const rate = getConversionRate(inputCurrency, baseCurrency);
    const convertedAmount = parsedAmount * rate;

    await addIncomeMutation.mutateAsync({ amount: convertedAmount, savingsAmt });
    setAmount("");
    setIsIncomeModalOpen(false);
  }


  if (statusQuery.isPending && !status) {
    return (
      <div className="space-y-4 lg:space-y-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.9fr)]">
          {/* Balance Card Skeleton */}
          <Card className="finance-hero-card overflow-hidden" variant="default">
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-full space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-40" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-[72px] rounded-[24px]" />
                  <Skeleton className="h-[72px] rounded-[24px]" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amount Input Skeleton */}
          <Card variant="default">
            <CardContent className="space-y-4">
              <Skeleton className="h-12 w-full rounded-[22px]" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-12 rounded-[22px]" />
                <Skeleton className="h-12 rounded-[22px]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Daily Limit Skeleton */}
          <Card variant="default">
            <CardContent className="space-y-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-2.5 w-full rounded-full" />
            </CardContent>
          </Card>

          {/* Savings Skeleton */}
          <Card variant="default">
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recurring Templates Skeleton */}
        <Card variant="default">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-16 w-full rounded-[24px]" />
            <Skeleton className="h-16 w-full rounded-[24px]" />
          </CardContent>
        </Card>
      </div>
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
          <div className="space-y-3">
            <p className="m-0 text-sm text-[var(--muted)]">{t("dashboard.errorDescription")}</p>
            <p className="m-0 break-words text-sm text-[var(--danger)]">{errorDetail}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <PullToRefresh onRefresh={async () => { await statusQuery.refetch(); }}>
      <div className="space-y-4 lg:space-y-5">

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.9fr)]">
          <BalanceCard
            balance={status.user.balance}
            isBalanceSaving={updateBalanceMutation.isPending}
            monthlyExp={status.user.monthlyExp}
            onBalanceChange={(balance) => updateBalanceMutation.mutateAsync({ balance })}
          />

          <AmountInput
            helperText={amountHelperText}
            isExpenseDisabled={!hasValidAmount || isActionBusy}
            isIncomeDisabled={!hasValidAmount || isActionBusy}
            onChange={setAmount}
            onExpense={() => setIsExpenseModalOpen(true)}
            onIncome={() => setIsIncomeModalOpen(true)}
            value={amount}
            currency={inputCurrency}
            onCurrencyChange={setInputCurrency}
          />

        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <DailyLimitCard
            dailyLimit={status.dailyLimit.dailyLimit}
            daysRemaining={status.dailyLimit.daysRemaining}
          />
          <SavingsCard
            goal={status.user.savingsGoal}
            onDeposit={() => setIsDepositModalOpen(true)}
            onSetGoal={() => setIsGoalModalOpen(true)}
            onWithdraw={() => setIsWithdrawModalOpen(true)}
            savings={status.user.savings}
          />
        </div>

        <RecurringTemplatesCard
          busyTemplateId={busyTemplateId}
          onAdd={() => {
            setEditingTemplate(null);
            setIsRecurringModalOpen(true);
          }}
          onApply={(template) => {
            void applyRecurringTransactionMutation.mutateAsync({ templateId: template.id });
          }}
          onDelete={(template) => setDeletingTemplate(template)}
          onEdit={(template) => {
            setEditingTemplate(template);
            setIsRecurringModalOpen(true);
          }}
          templates={status.user.recurringTransactions}
        />

        <SavingsModal
          amount={parsedAmount}
          isOpen={isIncomeModalOpen}
          isPending={addIncomeMutation.isPending}
          onClose={() => setIsIncomeModalOpen(false)}
          onSelect={(value) => {
            void handleIncome(value);
          }}
        />

        <ExpenseCategoryModal
          isOpen={isExpenseModalOpen}
          isPending={addExpenseMutation.isPending}
          onClose={() => setIsExpenseModalOpen(false)}
          onSelect={(category) => {
            void handleExpense(category);
          }}
        />

        <AmountActionModal
          confirmLabel={t("savings.saveGoal")}
          helperText={t("savings.goalHelper")}
          initialValue={status.user.savingsGoal}
          isOpen={isGoalModalOpen}
          isPending={updateSavingsGoalMutation.isPending}
          onClose={() => setIsGoalModalOpen(false)}
          onSubmit={(goal) => {
            void updateSavingsGoalMutation.mutateAsync({ goal }).then(() => setIsGoalModalOpen(false));
          }}
          placeholder={t("savings.goalPlaceholder")}
          question={t("savings.goalQuestion")}
          title={t("savings.setGoal")}
        />

        <AmountActionModal
          confirmLabel={t("savings.deposit")}
          helperText={t("savings.depositHelper", { amount: formatMoney(status.user.balance) })}
          isOpen={isDepositModalOpen}
          isPending={transferSavingsMutation.isPending}
          max={status.user.balance}
          onClose={() => setIsDepositModalOpen(false)}
          onSubmit={(value) => {
            void transferSavingsMutation
              .mutateAsync({ amount: value, direction: "to_savings" })
              .then(() => setIsDepositModalOpen(false));
          }}
          placeholder={t("savings.transferPlaceholder")}
          question={t("savings.depositQuestion")}
          title={t("savings.deposit")}
        />

        <AmountActionModal
          confirmLabel={t("savings.withdraw")}
          helperText={t("savings.withdrawHelper", { amount: formatMoney(status.user.savings) })}
          isOpen={isWithdrawModalOpen}
          isPending={transferSavingsMutation.isPending}
          max={status.user.savings}
          onClose={() => setIsWithdrawModalOpen(false)}
          onSubmit={(value) => {
            void transferSavingsMutation
              .mutateAsync({ amount: value, direction: "from_savings" })
              .then(() => setIsWithdrawModalOpen(false));
          }}
          placeholder={t("savings.transferPlaceholder")}
          question={t("savings.withdrawQuestion")}
          title={t("savings.withdraw")}
        />

        <RecurringTemplateModal
          initialTemplate={editingTemplate}
          isOpen={isRecurringModalOpen}
          isPending={saveRecurringTransactionMutation.isPending}
          onClose={() => {
            setEditingTemplate(null);
            setIsRecurringModalOpen(false);
          }}
          onSubmit={(template) => {
            void saveRecurringTransactionMutation.mutateAsync(template).then(() => {
              setEditingTemplate(null);
              setIsRecurringModalOpen(false);
            });
          }}
          suggestedAmount={hasValidAmount ? parsedAmount : undefined}
        />

        <ConfirmActionModal
          cancelLabel={t("common.cancel")}
          confirmLabel={t("recurring.delete")}
          description={
            deletingTemplate
              ? t("recurring.deleteDescription", { name: deletingTemplate.title })
              : undefined
          }
          isOpen={!!deletingTemplate}
          isPending={deleteRecurringTransactionMutation.isPending}
          onClose={() => setDeletingTemplate(null)}
          onConfirm={() => {
            if (!deletingTemplate) {
              return;
            }

            void deleteRecurringTransactionMutation
              .mutateAsync({ templateId: deletingTemplate.id })
              .then(() => setDeletingTemplate(null));
          }}
          question={t("recurring.deleteQuestion")}
          title={t("recurring.delete")}
        />
      </div>
    </PullToRefresh>
  );
}

