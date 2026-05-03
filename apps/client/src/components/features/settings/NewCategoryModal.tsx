import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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

interface NewCategoryModalProps {
  isOpen: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSave: (name: string, emoji: string) => void;
}

export function NewCategoryModal({
  isOpen,
  isPending,
  onClose,
  onSave,
}: NewCategoryModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setEmoji("");
    }
  }, [isOpen]);

  const canSave = name.trim().length > 0 && emoji.trim().length > 0;

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <ModalContainer placement="center" size="sm">
          <ModalDialog>
            <ModalCloseTrigger />

            <ModalHeader>
              <ModalHeading>{t("settings.addCategory")}</ModalHeading>
            </ModalHeader>

            <ModalBody>
              <div className="space-y-5">
                <div className="flex justify-center">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[var(--surface-secondary)] text-5xl">
                    {emoji.trim() ? (
                      <span>{emoji.trim()}</span>
                    ) : (
                      <span className="text-3xl text-[var(--muted)]">+</span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-[var(--muted)]">
                    {t("settings.categoryEmoji")}
                  </label>
                  <Input
                    fullWidth
                    maxLength={8}
                    placeholder="🏷️"
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
                    placeholder={t("settings.categoryNamePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  isDisabled={!canSave || isPending}
                  onPress={() => onSave(name, emoji)}
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
