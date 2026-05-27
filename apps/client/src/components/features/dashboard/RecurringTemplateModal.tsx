import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { RecurringTransaction, RecurringTransactionPayload, TransactionType } from "@/types/finance";
import { EXPENSE_CATEGORIES, getCategoryDisplay, isBuiltinCategory } from "@/components/features/shared/categoryMeta";
import { useFinance } from "@/hooks/useFinance";
import { Button, Input, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody, Select, TextArea } from "@/components/ui";


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
  const { status } = useFinance();
  const customCategories = status?.user.customCategories ?? [];
  const customizations = status?.user.categoryCustomizations ?? {};

  const allCategoryKeys = [
    ...EXPENSE_CATEGORIES,
    ...customCategories.map((c) => c.id),
  ];

  const [title, setTitle] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string>("food");
  const [savingsAmt, setSavingsAmt] = useState("");
  const [note, setNote] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("");
  const [autoApply, setAutoApply] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(initialTemplate?.title ?? "");
    setType(initialTemplate?.type ?? "expense");
    setAmount(String(initialTemplate?.amount ?? suggestedAmount ?? ""));
    setCategory(initialTemplate?.category ?? "food");
    setSavingsAmt(initialTemplate?.savingsAmt ? String(initialTemplate.savingsAmt) : "");
    setNote(initialTemplate?.note ?? "");
    setDayOfMonth(initialTemplate?.dayOfMonth ? String(initialTemplate.dayOfMonth) : "");
    setAutoApply(initialTemplate?.autoApply ?? false);
  }, [initialTemplate, isOpen, suggestedAmount]);

  const parsedAmount = Number(amount);
  const parsedSavings = Number(savingsAmt);
  const isValidAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;
  const isValidSavings = type !== "income"
    || !savingsAmt
    || (Number.isFinite(parsedSavings) && parsedSavings >= 0 && parsedSavings <= parsedAmount);

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <ModalContainer size="md">
          <ModalDialog>
            <ModalCloseTrigger />

            <ModalHeader>
              <div className="flex flex-col items-start gap-2">
                <p className="m-0 text-sm font-semibold text-[var(--modal-eyebrow)]">
                  {t("recurring.caption")}
                </p>
                <ModalHeading>
                  {initialTemplate ? t("recurring.editTitle") : t("recurring.createTitle")}
                </ModalHeading>
              </div>
            </ModalHeader>

            <ModalBody>
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
                    onChange={(event) => setType(event.target.value as TransactionType)}
                    value={type}
                    variant="secondary"
                  >
                    {transactionTypes.map((item) => (
                      <option key={item} value={item}>
                        {t(`transactionType.${item}`)}
                      </option>
                    ))}
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
                      onChange={(event) => setCategory(event.target.value)}
                      value={category}
                      variant="secondary"
                    >
                      {allCategoryKeys.map((key) => {
                        const display = getCategoryDisplay(key, { customCategories, customizations, t });
                        const prefix = !isBuiltinCategory(key) && display.emoji ? `${display.emoji} ` : "";
                        return (
                          <option key={key} value={key}>
                            {prefix}{display.name}
                          </option>
                        );
                      })}
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

                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-[var(--muted)]">
                    {t("recurring.dayOfMonth")}
                    <Input
                      fullWidth
                      max="28"
                      min="1"
                      onChange={(event) => setDayOfMonth(event.target.value)}
                      placeholder="—"
                      type="number"
                      value={dayOfMonth}
                      variant="secondary"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 self-end pb-2 text-sm text-[var(--muted)]">
                    <input
                      checked={autoApply}
                      className="h-4 w-4 accent-[var(--accent)]"
                      disabled={!dayOfMonth}
                      onChange={(event) => setAutoApply(event.target.checked)}
                      type="checkbox"
                    />
                    {t("recurring.autoApply")}
                  </label>
                </div>

                <Button
                  fullWidth
                  isDisabled={isPending || !title.trim() || !isValidAmount || !isValidSavings}
                  onPress={() => {
                    const parsedDay = dayOfMonth ? parseInt(dayOfMonth, 10) : null;
                    onSubmit({
                      id: initialTemplate?.id,
                      title,
                      type,
                      amount: parsedAmount,
                      category: type === "expense" ? category : null,
                      savingsAmt: type === "income" && savingsAmt ? parsedSavings : null,
                      note,
                      dayOfMonth: parsedDay !== null && parsedDay >= 1 && parsedDay <= 28 ? parsedDay : null,
                      autoApply: autoApply && Boolean(parsedDay),
                    });
                  }}
                  variant="primary"
                >
                  {initialTemplate ? t("recurring.save") : t("recurring.create")}
                </Button>
              </div>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}
