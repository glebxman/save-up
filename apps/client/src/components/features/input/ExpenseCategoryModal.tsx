import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CategoryCustomization, CustomCategory, ExpenseCategory } from "@/types/finance";
import { categoryMeta, EXPENSE_CATEGORIES } from "@/components/features/shared/categoryMeta";
import { Button, Input, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody } from "@/components/ui";

interface ExpenseCategoryModalProps {
  isOpen: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSelect: (category: string, note?: string) => void;
  title?: string;
  question?: string;
  categoryCustomizations?: Partial<Record<ExpenseCategory, CategoryCustomization>>;
  customCategories?: CustomCategory[];
}

export function ExpenseCategoryModal({
  isOpen,
  isPending,
  onClose,
  onSelect,
  title,
  question,
  categoryCustomizations,
  customCategories = [],
}: ExpenseCategoryModalProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setSelected(null);
      setNote("");
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!selected || isPending) return;
    onSelect(selected, note.trim() || undefined);
  };

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <ModalContainer size="sm">
          <ModalDialog>
            <ModalCloseTrigger />

            <ModalHeader>
              <div className="flex flex-col items-start gap-2">
                <p className="m-0 text-sm font-semibold text-[var(--modal-eyebrow)]">
                  {title ?? t("expenseCategory.title")}
                </p>
                <ModalHeading>{question ?? t("expenseCategory.question")}</ModalHeading>
              </div>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {EXPENSE_CATEGORIES.map((key) => {
                    const meta = categoryMeta[key];
                    const custom = categoryCustomizations?.[key];
                    const emoji = custom?.emoji;
                    const label = custom?.name ?? t(`expenseCategory.${key}`);
                    const isSelected = selected === key;

                    return (
                      <Button
                        key={key}
                        className="h-auto min-h-[92px] flex-col gap-2 px-2 py-3 text-center"
                        isDisabled={isPending}
                        onPress={() => setSelected(key)}
                        variant={isSelected ? "primary" : "secondary"}
                      >
                        {emoji ? (
                          <span className="text-2xl leading-none">{emoji}</span>
                        ) : (
                          <meta.icon className={`h-6 w-6 ${isSelected ? "text-current" : meta.color}`} />
                        )}
                        <span className="text-[10px] leading-tight">{label}</span>
                      </Button>
                    );
                  })}

                  {customCategories.map((cat) => {
                    const isSelected = selected === cat.id;
                    return (
                      <Button
                        key={cat.id}
                        className="h-auto min-h-[92px] flex-col gap-2 px-2 py-3 text-center"
                        isDisabled={isPending}
                        onPress={() => setSelected(cat.id)}
                        variant={isSelected ? "primary" : "secondary"}
                      >
                        <span className="text-2xl leading-none">{cat.emoji}</span>
                        <span className="text-[10px] leading-tight">{cat.name}</span>
                      </Button>
                    );
                  })}
                </div>

                <Input
                  fullWidth
                  maxLength={240}
                  placeholder={t("expenseCategory.notePlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />

                <Button
                  className="w-full"
                  isDisabled={!selected || isPending}
                  onPress={handleConfirm}
                  variant="primary"
                >
                  {t("expenseCategory.confirm")}
                </Button>
              </div>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}
