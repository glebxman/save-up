import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Input, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody } from "@/components/ui";
import { formatMoney } from "@/utils/format";
import { MAX_FINANCE_AMOUNT } from "@finance-twa/shared-types";


interface SavingsModalProps {
  amount: number;
  isOpen: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSelect: (value: number) => void;
}

export function SavingsModal({ amount, isOpen, isPending, onClose, onSelect }: SavingsModalProps) {
  const { t } = useTranslation();
  const [customValue, setCustomValue] = useState("");

  const quickActions = useMemo(
    () => [
      { key: "none", label: t("savings.saveNothing"), value: 0 },
      { key: "half", label: t("savings.saveHalf"), value: Number((amount / 2).toFixed(2)) },
      { key: "all", label: t("savings.saveAll"), value: amount },
    ],
    [amount, t],
  );

  const parsedCustomValue = Number(customValue);
  const hasValidCustomValue = Number.isFinite(parsedCustomValue) && parsedCustomValue >= 0 && parsedCustomValue <= amount;

  useEffect(() => {
    if (!isOpen) {
      setCustomValue("");
    }
  }, [isOpen]);

  function handleCustomSubmit() {
    const parsed = Number(customValue);

    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= amount) {
      onSelect(parsed);
      setCustomValue("");
    }
  }

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
        <ModalContainer size="sm">
          <ModalDialog>
            <ModalCloseTrigger />

            <ModalHeader>
              <div className="flex flex-col items-start gap-2">
                <p className="m-0 text-sm font-semibold text-[var(--modal-eyebrow)]">
                  {t("savings.setup")}
                </p>
                <ModalHeading>{t("savings.question")}</ModalHeading>
                <p className="m-0 text-sm text-[var(--muted)]">
                  {t("savings.incomeAmount", { amount: formatMoney(amount) })}
                </p>
              </div>
            </ModalHeader>

            <ModalBody>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-3 gap-2">
                  {quickActions.map(({ key, label, value }) => (
                    <Button
                      key={key}
                      className="w-full"
                      isDisabled={isPending}
                      onPress={() => {
                        onSelect(value);
                        setCustomValue("");
                      }}
                      variant={key === "half" ? "primary" : "secondary"}
                    >
                      {label}
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    fullWidth
                    max={String(Math.min(amount, MAX_FINANCE_AMOUNT))}
                    min="0"
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder={t("savings.customPlaceholder")}
                    type="number"
                    value={customValue}
                    variant="secondary"
                  />
                  <Button
                    className="shrink-0"
                    isDisabled={isPending || !customValue || !hasValidCustomValue}
                    onPress={handleCustomSubmit}
                    variant="primary"
                  >
                    {t("savings.confirm")}
                  </Button>
                </div>

                <p className="m-0 text-xs text-[var(--muted)]">
                  {t("savings.helperText", { amount: formatMoney(amount) })}
                </p>
              </div>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}

