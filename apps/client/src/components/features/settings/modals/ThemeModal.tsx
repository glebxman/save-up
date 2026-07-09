import { useTranslation } from "react-i18next";

import {
  Button,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading,
} from "@/components/ui";
import { useTheme, type ThemeMode } from "@/providers/ThemeProvider";

interface ThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeModal({ isOpen, onClose }: ThemeModalProps) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const options: Array<{ value: ThemeMode; labelKey: string }> = [
    { value: "auto", labelKey: "settings.themeAuto" },
    { value: "light", labelKey: "settings.themeLight" },
    { value: "dark", labelKey: "settings.themeDark" },
  ];

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
        <ModalContainer size="sm">
          <ModalDialog>
            <ModalCloseTrigger />
            <ModalHeader>
              <div className="flex flex-col gap-2">
                <ModalHeading>{t("settings.themeModalTitle")}</ModalHeading>
                <p className="m-0 text-sm text-[var(--muted)]">
                  {t("settings.themeModalDescription")}
                </p>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="grid gap-3">
                {options.map((option) => (
                  <Button
                    key={option.value}
                    className="w-full"
                    onPress={() => {
                      setTheme(option.value);
                      onClose();
                    }}
                    variant={theme === option.value ? "primary" : "secondary"}
                  >
                    {t(option.labelKey)}
                  </Button>
                ))}
              </div>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}
