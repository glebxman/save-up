import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { Debt } from "@finance-twa/shared-types";

import { Button, Card, CardContent, Input, Select, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody } from "@/components/ui";
import { useTelegram } from "@/hooks/useTelegram";
import { formatMoney } from "@/utils/format";
import * as api from "@/api/methods";
import { PlusIcon, TrashIcon } from "@/components/layout/icons";

export function Debts() {
  const { t } = useTranslation();
  const { initData } = useTelegram();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDirection, setNewDirection] = useState<"owed_to_me" | "i_owe">("owed_to_me");
  const [newDueDate, setNewDueDate] = useState("");
  const [newNote, setNewNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDebts = useCallback(async () => {
    if (!initData) return;
    try {
      const result = await api.getDebts(initData);
      setDebts(result);
    } catch (err) {
      console.error("Failed to load debts:", err);
    } finally {
      setLoading(false);
    }
  }, [initData]);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  const handleAdd = async () => {
    if (!initData || !newName.trim() || !newAmount || Number(newAmount) <= 0) return;
    setSubmitting(true);
    try {
      const debt = await api.addDebt(
        initData,
        newName.trim(),
        Number(newAmount),
        newDirection,
        newNote.trim() || undefined,
        newDueDate || undefined,
      );
      setDebts((prev) => [debt, ...prev]);
      setShowAddModal(false);
      setNewName("");
      setNewAmount("");
      setNewNote("");
      setNewDueDate("");
    } catch (err) {
      console.error("Failed to add debt:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async (debtId: string) => {
    if (!initData) return;
    try {
      await api.settleDebt(initData, debtId);
      setDebts((prev) => prev.filter((d) => d.id !== debtId));
    } catch (err) {
      console.error("Failed to settle debt:", err);
    }
  };

  const handleDelete = async (debtId: string) => {
    if (!initData) return;
    try {
      await api.deleteDebt(initData, debtId);
      setDebts((prev) => prev.filter((d) => d.id !== debtId));
    } catch (err) {
      console.error("Failed to delete debt:", err);
    }
  };

  const owedToMe = debts.filter((d) => d.direction === "owed_to_me");
  const iOwe = debts.filter((d) => d.direction === "i_owe");
  const totalOwedToMe = owedToMe.reduce((sum, d) => sum + d.amount, 0);
  const totalIOwe = iOwe.reduce((sum, d) => sum + d.amount, 0);
  const net = totalOwedToMe - totalIOwe;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("debts.title")}</h2>
        <Button onPress={() => setShowAddModal(true)} variant="primary" className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          {t("debts.addDebt")}
        </Button>
      </div>

      {debts.length === 0 && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <p className="text-lg font-medium text-[var(--muted)]">{t("debts.empty")}</p>
            <p className="mt-2 text-sm text-[var(--muted)]">{t("debts.emptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-[var(--muted)]">{t("debts.totalOwedToMe")}</p>
                <p className="mt-1 text-lg font-semibold text-green-500">{formatMoney(totalOwedToMe)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-[var(--muted)]">{t("debts.totalIOwe")}</p>
                <p className="mt-1 text-lg font-semibold text-red-500">{formatMoney(totalIOwe)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="py-4 text-center">
                <p className="text-xs text-[var(--muted)]">{t("debts.net")}</p>
                <p className={`mt-1 text-lg font-semibold ${net >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatMoney(Math.abs(net))}
                </p>
              </CardContent>
            </Card>
          </div>

          {owedToMe.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-[var(--muted)]">{t("debts.owedToMe")}</h3>
              <div className="space-y-2">
                {owedToMe.map((debt) => (
                  <DebtCard key={debt.id} debt={debt} onSettle={handleSettle} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {iOwe.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-medium text-[var(--muted)]">{t("debts.iOwe")}</h3>
              <div className="space-y-2">
                {iOwe.map((debt) => (
                  <DebtCard key={debt.id} debt={debt} onSettle={handleSettle} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Modal>
        <ModalBackdrop isOpen={showAddModal} onOpenChange={(open) => { if (!open) setShowAddModal(false); }} variant="blur">
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
                    onPress={handleAdd}
                    variant="primary"
                    className="w-full"
                    isDisabled={submitting || !newName.trim() || !newAmount}
                  >
                    {submitting ? "..." : t("debts.addDebt")}
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
              {t("debts.dueDate")}: {new Date(debt.dueDate).toLocaleDateString()}
            </p>
          )}
          {debt.note && (
            <p className="mt-1 text-xs text-[var(--muted)] truncate">{debt.note}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-semibold ${isOwedToMe ? "text-green-500" : "text-red-500"}`}>
            {formatMoney(debt.amount)}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => onSettle(debt.id)}
              aria-label={t("debts.settle")}
            >
              ✓
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
