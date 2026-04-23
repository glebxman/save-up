import { useEffect, useState } from "react";

import { Button, Chip, Input, Modal } from "@heroui/react";

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
  const isValid = hasValue
    && Number.isFinite(parsedValue)
    && parsedValue >= min
    && (max === undefined || parsedValue <= max);

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Modal.Header>
              <div className="flex flex-col gap-2">
                <Chip color="accent" variant="primary">
                  {title}
                </Chip>
                <Modal.Heading>{question}</Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <div className="flex flex-col gap-3">
                <Input
                  fullWidth
                  max={max !== undefined ? String(max) : undefined}
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
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
