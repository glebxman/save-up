import { Button, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody } from "@/components/ui";

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
      <ModalBackdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <ModalContainer placement="center" size="sm">
          <ModalDialog>
            <ModalCloseTrigger />

            <ModalHeader>
              <div className="flex flex-col items-start gap-2">
                <p className="m-0 text-sm font-semibold text-[var(--modal-warning-eyebrow)]">{title}</p>
                <ModalHeading>{question}</ModalHeading>
              </div>
            </ModalHeader>

            <ModalBody>
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
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}

