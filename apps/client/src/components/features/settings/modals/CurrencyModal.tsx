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
import { useFinance } from "@/hooks/useFinance";
import { useCurrency } from "@/hooks/useCurrency";
import { SUPPORTED_CURRENCIES } from "@/utils/currency";
import { getConversionRate } from "@/utils/exchange-rates";

interface CurrencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CurrencyModal({ isOpen, onClose }: CurrencyModalProps) {
  const { t } = useTranslation();
  const { currency, setCurrency } = useCurrency();
  const { convertCurrencyMutation } = useFinance();

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
        <ModalContainer size="sm">
          <ModalDialog>
            <ModalCloseTrigger />
            <ModalHeader>
              <div className="flex flex-col gap-2">
                <ModalHeading>{t("settings.currencyModalTitle")}</ModalHeading>
                <p className="m-0 text-sm text-[var(--muted)]">
                  {t("settings.currencyModalDescription")}
                </p>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="grid gap-3">
                {SUPPORTED_CURRENCIES.map((curr) => (
                  <Button
                    key={curr}
                    className="w-full"
                    isDisabled={convertCurrencyMutation.isPending}
                    onPress={() => {
                      if (curr !== currency) {
                        const rate = getConversionRate(currency, curr);
                        void convertCurrencyMutation.mutateAsync({ rate, currency: curr }).then(() => {
                          setCurrency(curr);
                          onClose();
                        });
                        return;
                      }
                      onClose();
                    }}
                    variant={currency === curr ? "primary" : "secondary"}
                  >
                    {t(
                      `settings.currency${curr.charAt(0).toUpperCase()}${curr.slice(1).toLowerCase()}`,
                    )}
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
