import { useEffect, useState } from "react";

import { Button, Chip, Input, ListBox, Modal, Select, TextArea } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { ExpenseCategory, RecurringTransaction, RecurringTransactionPayload, TransactionType } from "@/types/finance";
import { EXPENSE_CATEGORIES } from "@/components/features/shared/categoryMeta";

interface RecurringTemplateModalProps {
  isOpen: boolean;
  isPending?: boolean;
  initialTemplate?: RecurringTransaction | null;
  suggestedAmount?: number;
  onClose: () => void;
  onSubmit: (template: RecurringTransactionPayload) => void;
}

const transactionTypes: TransactionType[] = ["income", "expense", "transfer_to_savings", "transfer_from_savings"];

export function RecurringTemplateModal({
  isOpen,
  isPending,
  initialTemplate,
  suggestedAmount,
  onClose,
  onSubmit,
}: RecurringTemplateModalProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [savingsAmt, setSavingsAmt] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(initialTemplate?.title ?? "");
    setType(initialTemplate?.type ?? "expense");
    setAmount(String(initialTemplate?.amount ?? suggestedAmount ?? ""));
    setCategory((initialTemplate?.category as ExpenseCategory | null) ?? "food");
    setSavingsAmt(initialTemplate?.savingsAmt ? String(initialTemplate.savingsAmt) : "");
    setNote(initialTemplate?.note ?? "");
  }, [initialTemplate, isOpen, suggestedAmount]);

  const parsedAmount = Number(amount);
  const parsedSavings = Number(savingsAmt);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isValidSavings = type !== "income"
    || !savingsAmt
    || (Number.isFinite(parsedSavings) && parsedSavings >= 0 && parsedSavings <= parsedAmount);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <Modal.Container placement="center" size="md">
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Modal.Header>
              <div className="flex flex-col gap-2">
                <Chip color="accent" variant="primary">
                  {t("recurring.caption")}
                </Chip>
                <Modal.Heading>
                  {initialTemplate ? t("recurring.editTitle") : t("recurring.createTitle")}
                </Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <div className="grid gap-3">
                <label className="text-sm text-[var(--muted)]">
                  {t("recurring.name")}
                  <Input
                    fullWidth
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={t("recurring.namePlaceholder")}
                    value={title}
                    variant="secondary"
                  />
                </label>

                <label className="text-sm text-[var(--muted)]">
                  {t("recurring.type")}
                  <Select
                    aria-label={t("recurring.type")}
                    fullWidth
                    onSelectionChange={(key) => setType(String(key) as TransactionType)}
                    selectedKey={type}
                    variant="secondary"
                  >
                    <Select.Trigger>
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {transactionTypes.map((item) => (
                          <ListBox.Item id={item} key={item} textValue={t(`transactionType.${item}`)}>
                            {t(`transactionType.${item}`)}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </label>

                <label className="text-sm text-[var(--muted)]">
                  {t("recurring.amount")}
                  <Input
                    fullWidth
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0"
                    type="number"
                    value={amount}
                    variant="secondary"
                  />
                </label>

                {type === "expense" ? (
                  <label className="text-sm text-[var(--muted)]">
                    {t("recurring.category")}
                    <Select
                      aria-label={t("recurring.category")}
                      fullWidth
                      onSelectionChange={(key) => setCategory(String(key) as ExpenseCategory)}
                      selectedKey={category}
                      variant="secondary"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {EXPENSE_CATEGORIES.map((item) => (
                            <ListBox.Item id={item} key={item} textValue={t(`expenseCategory.${item}`)}>
                              {t(`expenseCategory.${item}`)}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </label>
                ) : null}

                {type === "income" ? (
                  <label className="text-sm text-[var(--muted)]">
                    {t("recurring.savingsPart")}
                    <Input
                      fullWidth
                      onChange={(event) => setSavingsAmt(event.target.value)}
                      placeholder="0"
                      type="number"
                      value={savingsAmt}
                      variant="secondary"
                    />
                  </label>
                ) : null}

                <label className="text-sm text-[var(--muted)]">
                  {t("recurring.note")}
                  <TextArea
                    fullWidth
                    onChange={(event) => setNote(event.target.value)}
                    placeholder={t("recurring.notePlaceholder")}
                    rows={4}
                    value={note}
                    variant="secondary"
                  />
                </label>

                <Button
                  fullWidth
                  isDisabled={isPending || !title.trim() || !isValidAmount || !isValidSavings}
                  onPress={() =>
                    onSubmit({
                      id: initialTemplate?.id,
                      title,
                      type,
                      amount: parsedAmount,
                      category: type === "expense" ? category : null,
                      savingsAmt: type === "income" && savingsAmt ? parsedSavings : null,
                      note,
                    })}
                  variant="primary"
                >
                  {initialTemplate ? t("recurring.save") : t("recurring.create")}
                </Button>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
