import { useTranslation } from "react-i18next";
import type { ExpenseCategory } from "@/types/finance";
import { categoryMeta, EXPENSE_CATEGORIES } from "@/components/features/shared/categoryMeta";
import { Button, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody } from "@/components/ui";


interface ExpenseCategoryModalProps {
  isOpen: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSelect: (category: ExpenseCategory) => void;
  selectedCategory?: ExpenseCategory | null;
  title?: string;
  question?: string;
}

export function ExpenseCategoryModal({
  isOpen,
  isPending,
  onClose,
  onSelect,
  selectedCategory,
  title,
  question,
}: ExpenseCategoryModalProps) {
  const { t } = useTranslation();

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <ModalContainer placement="center" size="sm">
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
              <div className="grid grid-cols-4 gap-2">
                {EXPENSE_CATEGORIES.map((key) => {
                  const meta = categoryMeta[key];

                  return (
                    <Button
                      key={key}
                      className="h-auto min-h-[92px] flex-col gap-2 px-2 py-3 text-center"
                      isDisabled={isPending}
                      onPress={() => onSelect(key)}
                      variant={selectedCategory === key ? "primary" : "secondary"}
                    >
                      <meta.icon className={`h-6 w-6 ${selectedCategory === key ? "text-current" : meta.color}`} />
                      <span className="text-[10px] leading-tight">
                        {t(`expenseCategory.${key}`)}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}

