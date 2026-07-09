import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import type { ExpenseCategory, Transaction, TransactionUpdatePayload } from "@/types/finance";
import { EXPENSE_CATEGORIES } from "@/components/features/shared/categoryMeta";
import { Button, Input, Modal, Select, TextArea } from "@/components/ui";
import { toDateInputValue } from "@/utils/format";

interface TransactionEditModalProps {
  isOpen: boolean;
  isPending?: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSubmit: (payload: TransactionUpdatePayload) => void;
}

export function TransactionEditModal({
  isOpen,
  isPending,
  transaction,
  onClose,
  onSubmit,
}: TransactionEditModalProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [savingsAmt, setSavingsAmt] = useState("");

  useEffect(() => {
    if (!isOpen || !transaction) {
      return;
    }

    setAmount(String(transaction.amount));
    setOccurredAt(toDateInputValue(transaction.occurredAt));
    setNote(transaction.note ?? "");
    setCategory((transaction.category as ExpenseCategory | null) ?? "food");
    setSavingsAmt(transaction.savingsAmt ? String(transaction.savingsAmt) : "");
  }, [isOpen, transaction]);

  if (!transaction) {
    return null;
  }

  const parsedAmount = Number(amount);
  const parsedSavingsAmt = Number(savingsAmt);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isValidSavings = transaction.type !== "income"
    || !savingsAmt
    || (Number.isFinite(parsedSavingsAmt) && parsedSavingsAmt >= 0 && parsedSavingsAmt <= parsedAmount);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <Modal.Container size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Modal.Header>
              <div className="flex flex-col items-start gap-2">
                <p className="m-0 text-sm font-semibold text-[var(--modal-eyebrow)]">
                  {t("history.edit")}
                </p>
                <Modal.Heading>{t("history.editQuestion")}</Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <div className="grid gap-3">
                <label className="text-sm text-[var(--muted)]">
                  {t("history.amount")}
                  <Input
                    fullWidth
                    onChange={(event) => setAmount(event.target.value)}
                    type="number"
                    value={amount}
                    variant="secondary"
                  />
                </label>

                <label className="text-sm text-[var(--muted)]">
                  {t("history.date")}
                  <Input
                    fullWidth
                    onChange={(event) => setOccurredAt(event.target.value)}
                    type="date"
                    value={occurredAt}
                    variant="secondary"
                  />
                </label>

                {transaction.type === "expense" ? (
                  <label className="text-sm text-[var(--muted)]">
                    {t("history.category")}
                    <Select
                      aria-label={t("history.category")}
                      fullWidth
                      onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
                      value={category}
                      variant="secondary"
                    >
                      {EXPENSE_CATEGORIES.map((item) => (
                        <option key={item} value={item}>
                          {t(`expenseCategory.${item}`)}
                        </option>
                      ))}
                    </Select>
                  </label>
                ) : null}

                {transaction.type === "income" ? (
                  <label className="text-sm text-[var(--muted)]">
                    {t("history.savingsPart")}
                    <Input
                      fullWidth
                      onChange={(event) => setSavingsAmt(event.target.value)}
                      type="number"
                      value={savingsAmt}
                      variant="secondary"
                    />
                  </label>
                ) : null}

                <label className="text-sm text-[var(--muted)]">
                  {t("history.note")}
                  <TextArea
                    fullWidth
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t("history.notePlaceholder")}
                    rows={4}
                    value={note}
                    variant="secondary"
                  />
                </label>

                <Button
                  fullWidth
                  isDisabled={isPending || !isValidAmount || !isValidSavings || !occurredAt}
                  onPress={() =>
                    onSubmit({
                      transactionId: transaction.id,
                      amount: parsedAmount,
                      category: transaction.type === "expense" ? category : null,
                      savingsAmt: transaction.type === "income" && savingsAmt ? parsedSavingsAmt : undefined,
                      note,
                      occurredAt,
                    })}
                  variant="primary"
                >
                  {t("history.save")}
                </Button>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
