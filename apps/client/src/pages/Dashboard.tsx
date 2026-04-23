import { useState } from "react";

import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from "@heroui/react";
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
import { useFinance } from "@/hooks/useFinance";
import type { ExpenseCategory, RecurringTransaction } from "@/types/finance";
import { formatMoney } from "@/utils/format";

export function Dashboard() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RecurringTransaction | null>(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<RecurringTransaction | null>(null);
  const {
    status,
    statusQuery,
    addExpenseMutation,
    addIncomeMutation,
    transferSavingsMutation,
    updateSavingsGoalMutation,
    saveRecurringTransactionMutation,
    deleteRecurringTransactionMutation,
    applyRecurringTransactionMutation,
  } = useFinance();

  const parsedAmount = Number(amount);
  const hasValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
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

    await addExpenseMutation.mutateAsync({ amount: parsedAmount, category });
    setAmount("");
    setIsExpenseModalOpen(false);
  }

  async function handleIncome(savingsAmt: number): Promise<void> {
    if (!hasValidAmount) {
      return;
    }

    await addIncomeMutation.mutateAsync({ amount: parsedAmount, savingsAmt });
    setAmount("");
    setIsIncomeModalOpen(false);
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

      <AmountInput
        isExpenseDisabled={!hasValidAmount || isActionBusy}
        isIncomeDisabled={!hasValidAmount || isActionBusy}
        onChange={setAmount}
        onExpense={() => setIsExpenseModalOpen(true)}
        onIncome={() => setIsIncomeModalOpen(true)}
        value={amount}
      />

      <div className="grid gap-4 sm:grid-cols-2">
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
  );
}
