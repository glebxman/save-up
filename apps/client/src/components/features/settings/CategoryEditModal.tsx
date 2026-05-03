import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { CategoryCustomization, ExpenseCategory } from "@/types/finance";
import { categoryMeta } from "@/components/features/shared/categoryMeta";
import {
  Button,
  Input,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading,
} from "@/components/ui";

interface CategoryEditModalProps {
  category: ExpenseCategory | null;
  customization?: CategoryCustomization;
  isOpen: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSave: (category: ExpenseCategory, name: string, emoji: string) => void;
}

export function CategoryEditModal({
  category,
  customization,
  isOpen,
  isPending,
  onClose,
  onSave,
}: CategoryEditModalProps) {
  const { t } = useTranslation();
  const meta = category ? categoryMeta[category] : null;

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");

  useEffect(() => {
    if (isOpen && category) {
      setName(customization?.name ?? "");
      setEmoji(customization?.emoji ?? "");
    }
  }, [isOpen, category, customization]);

  const handleSave = () => {
    if (!category || isPending) return;
    onSave(category, name, emoji);
  };

  const previewEmoji = emoji.trim();
  const defaultEmoji = meta?.defaultEmoji ?? "";

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <ModalContainer placement="center" size="sm">
          <ModalDialog>
            <ModalCloseTrigger />

            <ModalHeader>
              <ModalHeading>{t("settings.editCategory")}</ModalHeading>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-5">
                <div className="flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[var(--surface-secondary)] text-5xl">
                    {previewEmoji ? (
                      <span>{previewEmoji}</span>
                    ) : defaultEmoji ? (
                      <span>{defaultEmoji}</span>
                    ) : meta ? (
                      <meta.icon className={`h-10 w-10 ${meta.color}`} />
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--muted)]">
                    {t("settings.categoryEmoji")}
                  </label>
                  <Input
                    fullWidth
                    maxLength={8}
                    placeholder={defaultEmoji || "🏷️"}
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--muted)]">
                    {t("settings.categoryName")}
                  </label>
                  <Input
                    fullWidth
                    maxLength={30}
                    placeholder={category ? t(`expenseCategory.${category}`) : ""}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p className="text-xs text-[var(--muted)]">{t("settings.categoryResetTip")}</p>
                </div>

                <Button
                  className="w-full"
                  isDisabled={isPending}
                  onPress={handleSave}
                  variant="primary"
                >
                  {t("settings.save")}
                </Button>
              </div>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}
