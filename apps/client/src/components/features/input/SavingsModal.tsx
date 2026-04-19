import { Button, Chip, Modal } from "@heroui/react";
import { useTranslation } from "react-i18next";

import type { SavingsPct } from "@/types/finance";

interface SavingsModalProps {
  isOpen: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSelect: (value: SavingsPct) => void;
}

const options: SavingsPct[] = [10, 20, 30];

export function SavingsModal({ isOpen, isPending, onClose, onSelect }: SavingsModalProps) {
  const { t } = useTranslation();

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Modal.Header>
              <div className="flex flex-col gap-2">
                <Chip color="accent" variant="soft">
                  {t("savings.setup")}
                </Chip>
                <Modal.Heading>{t("savings.question")}</Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <div className="grid grid-cols-3 gap-3">
                {options.map((value) => (
                  <Button
                    key={value}
                    isDisabled={isPending}
                    onPress={() => onSelect(value)}
                    variant={value === 20 ? "primary" : "secondary"}
                  >
                    {value}%
                  </Button>
                ))}
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
