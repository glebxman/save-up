import { useEffect, useState } from "react";
import { Button, Input, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody } from "@/components/ui";
import { MAX_FINANCE_AMOUNT } from "@finance-twa/shared-types";


interface AmountActionModalProps {
  isOpen: boolean;
  isPending?: boolean;
  title: string;
  question: string;
  confirmLabel: string;
  placeholder: string;
  helperText?: string;
  initialValue?: number;
  min?: number;
  max?: number;
  onClose: () => void;
  onSubmit: (value: number) => void;
}
export function AmountActionModal({
  isOpen,
  isPending,
  title,
  question,
  confirmLabel,
  placeholder,
  helperText,
  initialValue,
  min = 0,
  max,
  onClose,
  onSubmit,
}: AmountActionModalProps) {
  const [value, setValue] = useState(initialValue !== undefined ? String(initialValue) : "");

  useEffect(() => {
    if (isOpen) {
      setValue(initialValue !== undefined ? String(initialValue) : "");
    }
  }, [initialValue, isOpen]);

  const parsedValue = Number(value);
  const hasValue = value.trim().length > 0;
  const effectiveMax = max === undefined ? MAX_FINANCE_AMOUNT : Math.min(max, MAX_FINANCE_AMOUNT);
  const isValid = hasValue
    && Number.isFinite(parsedValue)
    && parsedValue >= min
    && parsedValue <= effectiveMax;

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <ModalContainer placement="center" size="sm">
          <ModalDialog>
            <ModalCloseTrigger />

            <ModalHeader>
              <div className="flex flex-col items-start gap-2">
                <p className="m-0 text-sm font-semibold text-[var(--modal-eyebrow)]">{title}</p>
                <ModalHeading>{question}</ModalHeading>
              </div>
            </ModalHeader>

            <ModalBody>
              <div className="flex flex-col gap-3">
                <Input
                  fullWidth
                  max={String(effectiveMax)}
                  min={String(min)}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder={placeholder}
                  type="number"
                  value={value}
                  variant="secondary"
                />

                {helperText ? (
                  <p className="m-0 text-xs text-[var(--muted)]">{helperText}</p>
                ) : null}

                <Button
                  fullWidth
                  isDisabled={!isValid || isPending}
                  onPress={() => onSubmit(parsedValue)}
                  variant="primary"
                >
                  {confirmLabel}
                </Button>
              </div>
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}

