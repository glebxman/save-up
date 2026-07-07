import { useState } from "react";
import { useTranslation } from "react-i18next";

import { BalanceCard } from "@/components/features/dashboard/BalanceCard";
import { AccountsModal } from "@/components/features/dashboard/AccountsModal";
import { DailyLimitTile } from "@/components/features/dashboard/DailyLimitTile";
import { RecurringStrip } from "@/components/features/dashboard/RecurringStrip";
import { RecurringTemplateModal } from "@/components/features/dashboard/RecurringTemplateModal";
import { SavingsTile } from "@/components/features/dashboard/SavingsTile";
import { ExpenseCategoryModal } from "@/components/features/input/ExpenseCategoryModal";
import { AmountInput } from "@/components/features/input/AmountInput";
import { SavingsModal } from "@/components/features/input/SavingsModal";
import { AmountActionModal } from "@/components/features/shared/AmountActionModal";
import { ConfirmActionModal } from "@/components/features/shared/ConfirmActionModal";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from "@/components/ui";

import { useFinance } from "@/hooks/useFinance";
import { useTelegram } from "@/hooks/useTelegram";
import { useCurrency } from "@/hooks/useCurrency";
import { getConversionRate } from "@/utils/exchange-rates";
import type { RecurringTransaction } from "@/types/finance";
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
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const { currency: baseCurrency } = useCurrency();
  const [inputCurrency, setInputCurrency] = useState<CurrencyCode>(baseCurrency);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

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
    createAccountMutation,
    updateAccountMutation,
    deleteAccountMutation,
    setCryptoHoldingMutation,
    transferBetweenAccountsMutation,
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

  const activeAccountId = selectedAccountId || (status?.user?.accounts?.[0]?.id ?? null);
  const activeAccount = status?.user?.accounts?.find((acc) => acc.id === activeAccountId);
  const targetCurrency = activeAccount?.currency || baseCurrency;

  async function handleExpense(category: string, note?: string): Promise<void> {
    if (!hasValidAmount) return;
    const rate = getConversionRate(inputCurrency, targetCurrency);
    await addExpenseMutation.mutateAsync({
      amount: parsedAmount * rate,
      category,
      note,
      accountId: activeAccountId || undefined,
    });
    setAmount("");
    setIsExpenseModalOpen(false);
  }

  async function handleIncome(savingsAmt: number): Promise<void> {
    if (!hasValidAmount) return;
    const rate = getConversionRate(inputCurrency, targetCurrency);
    await addIncomeMutation.mutateAsync({
      amount: parsedAmount * rate,
      savingsAmt,
      accountId: activeAccountId || undefined,
    });
    setAmount("");
    setIsIncomeModalOpen(false);
  }

  if (statusQuery.isPending && !status) {
    return (
      <div className="space-y-3">
        <Card variant="default">
          <CardContent compact className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-44" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 rounded-[18px]" />
              <Skeleton className="h-16 rounded-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card variant="default">
          <CardContent compact className="space-y-3">
            <Skeleton className="h-12 w-full rounded-[20px]" />
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-10 rounded-[18px]" />
              <Skeleton className="h-10 rounded-[18px]" />
            </div>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-32 rounded-[24px]" />
          <Skeleton className="h-32 rounded-[24px]" />
        </div>
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
    <div>
      <div className="space-y-3 pb-2 lg:space-y-4">
        {/* Balance hero — always full width, the most prominent block. */}
        <BalanceCard
          balance={status.user.balance}
          isBalanceSaving={updateBalanceMutation.isPending}
          monthlyExp={status.user.monthlyExp}
          onBalanceChange={(balance) => updateBalanceMutation.mutateAsync({ balance })}
          accounts={status.user.accounts}
          onManageAccounts={() => setIsAccountsModalOpen(true)}
        />

        {/* Quick entry: amount + income/expense buttons in one card. */}
        <AmountInput
          currency={inputCurrency}
          helperText={amountHelperText}
          isExpenseDisabled={!hasValidAmount || isActionBusy}
          isIncomeDisabled={!hasValidAmount || isActionBusy}
          onChange={setAmount}
          onCurrencyChange={setInputCurrency}
          onExpense={() => setIsExpenseModalOpen(true)}
          onIncome={() => setIsIncomeModalOpen(true)}
          value={amount}
          accounts={status.user.accounts}
          activeAccountId={activeAccountId}
          onActiveAccountChange={setSelectedAccountId}
        />

        {/* Daily limit & savings sit side-by-side and don't dominate. */}
        <div className="grid grid-cols-2 gap-2">
          <DailyLimitTile
            dailyLimit={status.dailyLimit.dailyLimit}
            daysRemaining={status.dailyLimit.daysRemaining}
          />
          <SavingsTile
            goal={status.user.savingsGoal}
            onDeposit={() => setIsDepositModalOpen(true)}
            onSetGoal={() => setIsGoalModalOpen(true)}
            onWithdraw={() => setIsWithdrawModalOpen(true)}
            savings={status.user.savings}
          />
        </div>

        {/* Recurring templates: horizontal strip instead of stacked cards. */}
        <RecurringStrip
          busyTemplateId={busyTemplateId}
          onAdd={() => {
            setEditingTemplate(null);
            setIsRecurringModalOpen(true);
          }}
          onApply={(template) => {
            void applyRecurringTransactionMutation.mutateAsync({ templateId: template.id });
          }}
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
          categoryCustomizations={status.user.categoryCustomizations}
          customCategories={status.user.customCategories}
          isOpen={isExpenseModalOpen}
          isPending={addExpenseMutation.isPending}
          onClose={() => setIsExpenseModalOpen(false)}
          onSelect={(category, note) => {
            void handleExpense(category, note);
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
            void updateSavingsGoalMutation
              .mutateAsync({ goal })
              .then(() => setIsGoalModalOpen(false));
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
          onDelete={(template) => {
            setEditingTemplate(null);
            setIsRecurringModalOpen(false);
            setDeletingTemplate(template);
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
            if (!deletingTemplate) return;
            void deleteRecurringTransactionMutation
              .mutateAsync({ templateId: deletingTemplate.id })
              .then(() => setDeletingTemplate(null));
          }}
          question={t("recurring.deleteQuestion")}
          title={t("recurring.delete")}
        />

        <AccountsModal
          isOpen={isAccountsModalOpen}
          onClose={() => setIsAccountsModalOpen(false)}
          accounts={status.user.accounts}
          rates={status.rates}
          onCreateAccount={(name, type, currency, initialBalance, holdings) =>
            createAccountMutation.mutateAsync({ name, type, currency, initialBalance, holdings })
          }
          onUpdateAccount={(accountId, name) =>
            updateAccountMutation.mutateAsync({ accountId, name })
          }
          onDeleteAccount={(accountId) => deleteAccountMutation.mutateAsync({ accountId })}
          onSetCryptoHolding={(accountId, symbol, amount) =>
            setCryptoHoldingMutation.mutateAsync({ accountId, symbol, amount })
          }
          onTransfer={(params) => transferBetweenAccountsMutation.mutateAsync(params)}
        />
      </div>
    </div>
  );
}
