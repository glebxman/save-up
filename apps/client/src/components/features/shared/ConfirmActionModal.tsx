import { Button, Chip, Modal } from "@heroui/react";

interface ConfirmActionModalProps {
  isOpen: boolean;
  isPending?: boolean;
  title: string;
  question: string;
  description?: string;
  cancelLabel?: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmActionModal({
  isOpen,
  isPending,
  title,
  question,
  description,
  cancelLabel = "Cancel",
  confirmLabel,
  onClose,
  onConfirm,
}: ConfirmActionModalProps) {
  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Modal.Header>
              <div className="flex flex-col gap-2">
                <Chip color="warning" variant="primary">
                  {title}
                </Chip>
                <Modal.Heading>{question}</Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <div className="flex flex-col gap-3">
                {description ? <p className="m-0 text-sm text-[var(--muted)]">{description}</p> : null}

                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full" isDisabled={isPending} onPress={onClose} variant="secondary">
                    {cancelLabel}
                  </Button>
                  <Button className="w-full" isDisabled={isPending} onPress={onConfirm} variant="danger-soft">
                    {confirmLabel}
                  </Button>
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
