import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Debt } from "@finance-twa/shared-types";

import {
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading,
  Select,
  Spinner,
} from "@/components/ui";
import { CheckIcon, PlusIcon, TrashIcon } from "@/components/layout/icons";
import { useDebts } from "@/hooks/useFinance";
import { formatDate, formatMoney } from "@/utils/format";

export function Debts() {
  const { t } = useTranslation();
  const {
    debts,
    debtsQuery,
    owedToMe,
    iOwe,
    totalOwedToMe,
    totalIOwe,
    net,
    addDebtMutation,
    settleDebtMutation,
    deleteDebtMutation,
  } = useDebts();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDirection, setNewDirection] = useState<"owed_to_me" | "i_owe">("owed_to_me");
  const [newDueDate, setNewDueDate] = useState("");
  const [newNote, setNewNote] = useState("");

  const parsedAmount = Number(newAmount);
  const canSubmit =
    newName.trim().length > 0 &&
    newAmount.trim().length > 0 &&
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0;

  const resetForm = () => {
    setNewName("");
    setNewAmount("");
    setNewDirection("owed_to_me");
    setNewNote("");
    setNewDueDate("");
  };

  const handleAdd = async () => {
    if (!canSubmit) return;

    try {
      await addDebtMutation.mutateAsync({
        name: newName.trim(),
        amount: parsedAmount,
        direction: newDirection,
        note: newNote.trim() || undefined,
        dueDate: newDueDate || undefined,
      });
      setShowAddModal(false);
      resetForm();
    } catch {
      // The mutation hook already shows the user-facing error toast.
    }
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const isLoading = debtsQuery.isLoading;

  return (
    <div className="space-y-6" data-onboarding="debts">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t("debts.title")}</h2>
        <Button onPress={() => setShowAddModal(true)} variant="primary" className="shrink-0">
          <PlusIcon className="h-4 w-4" />
          {t("debts.addDebt")}
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex min-h-40 items-center justify-center">
            <Spinner size="md" />
          </CardContent>
        </Card>
      ) : debts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <p className="text-lg font-medium text-[var(--muted)]">{t("debts.empty")}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("debts.emptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <DebtSummaryCard
              label={t("debts.totalOwedToMe")}
              value={formatMoney(totalOwedToMe)}
              tone="positive"
            />
            <DebtSummaryCard
              label={t("debts.totalIOwe")}
              value={formatMoney(totalIOwe)}
              tone="negative"
            />
            <DebtSummaryCard
              label={t("debts.net")}
              value={formatMoney(Math.abs(net))}
              tone={net >= 0 ? "positive" : "negative"}
            />
          </div>

          <DebtSection
            debts={owedToMe}
            onDelete={(debtId) => deleteDebtMutation.mutate(debtId)}
            onSettle={(debtId) => settleDebtMutation.mutate(debtId)}
            title={t("debts.owedToMe")}
          />

          <DebtSection
            debts={iOwe}
            onDelete={(debtId) => deleteDebtMutation.mutate(debtId)}
            onSettle={(debtId) => settleDebtMutation.mutate(debtId)}
            title={t("debts.iOwe")}
          />
        </>
      )}

      <Modal>
        <ModalBackdrop isOpen={showAddModal} onOpenChange={(open) => { if (!open) closeAddModal(); }}>
          <ModalContainer>
            <ModalDialog>
              <ModalCloseTrigger />
              <ModalHeader>
                <ModalHeading>{t("debts.addDebt")}</ModalHeading>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("debts.name")}</label>
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={t("debts.name")}
                      fullWidth
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("debts.amount")}</label>
                    <Input
                      type="number"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                      placeholder={t("debts.amount")}
                      min="0"
                      step="0.01"
                      fullWidth
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("debts.direction")}</label>
                    <Select
                      value={newDirection}
                      onChange={(e) => setNewDirection(e.target.value as "owed_to_me" | "i_owe")}
                      fullWidth
                    >
                      <option value="owed_to_me">{t("debts.owedToMe")}</option>
                      <option value="i_owe">{t("debts.iOwe")}</option>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("debts.dueDate")}</label>
                    <Input
                      type="date"
                      value={newDueDate}
                      onChange={(e) => setNewDueDate(e.target.value)}
                      fullWidth
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">{t("debts.note")}</label>
                    <Input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder={t("debts.note")}
                      fullWidth
                    />
                  </div>
                  <Button
                    onPress={() => void handleAdd()}
                    variant="primary"
                    className="w-full"
                    isDisabled={addDebtMutation.isPending || !canSubmit}
                  >
                    {addDebtMutation.isPending ? "..." : t("debts.addDebt")}
                  </Button>
                </div>
              </ModalBody>
            </ModalDialog>
          </ModalContainer>
        </ModalBackdrop>
      </Modal>
    </div>
  );
}

function DebtSummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "negative";
}) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <p className="text-xs text-[var(--muted)]">{label}</p>
        <p className={`mt-1 text-lg font-semibold ${tone === "positive" ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function DebtSection({
  debts,
  onSettle,
  onDelete,
  title,
}: {
  debts: Debt[];
  onSettle: (id: string) => void;
  onDelete: (id: string) => void;
  title: string;
}) {
  if (debts.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-[var(--muted)]">{title}</h3>
      <div className="space-y-2">
        {debts.map((debt) => (
          <DebtCard key={debt.id} debt={debt} onSettle={onSettle} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

function DebtCard({
  debt,
  onSettle,
  onDelete,
}: {
  debt: Debt;
  onSettle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const isOwedToMe = debt.direction === "owed_to_me";

  return (
    <Card>
      <CardContent className="flex items-center justify-between py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{isOwedToMe ? "💰" : "💳"}</span>
            <span className="font-medium truncate">{debt.name}</span>
          </div>
          {debt.dueDate && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {t("debts.dueDate")}: {formatDate(debt.dueDate)}
            </p>
          )}
          {debt.note && (
            <p className="mt-1 text-xs text-[var(--muted)] truncate">{debt.note}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-semibold ${isOwedToMe ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {formatMoney(debt.amount)}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => onSettle(debt.id)}
              aria-label={t("debts.settle")}
            >
              <CheckIcon className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onPress={() => onDelete(debt.id)}
              aria-label={t("debts.delete")}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
