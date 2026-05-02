import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ArrowDownLeftIcon, ArrowUpRightIcon, XMarkIcon } from "@/components/layout/icons";
import { Button, Card, CardContent, CardFooter, Input, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody } from "@/components/ui";

import { formatInputWithРазделителями, parseFormattedInput, getCurrencySymbol, formatMoney } from "@/utils/format";
import { useCurrency } from "@/hooks/useCurrency";
import { getConversionRate } from "@/utils/exchange-rates";
import { MAX_FINANCE_AMOUNT, type CurrencyCode } from "@finance-twa/shared-types";
import { VoiceAssistant } from "@/components/features/ai/VoiceAssistant";



interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onIncome?: () => void;
  onExpense?: () => void;
  isIncomeDisabled?: boolean;
  isExpenseDisabled?: boolean;
  helperText?: string;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
}

export function AmountInput({
  value,
  onChange,
  onIncome,
  onExpense,
  isIncomeDisabled,
  isExpenseDisabled,
  helperText,
  currency,
  onCurrencyChange,
}: AmountInputProps) {
  const { t } = useTranslation();
  const { currency: baseCurrency } = useCurrency();
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [displayValue, setDisplayValue] = useState(formatInputWithРазделителями(value));

  const rate = getConversionRate(currency as CurrencyCode, baseCurrency);
  const convertedValue = Number(value) * rate;
  const isDifferentCurrency = currency !== baseCurrency;



  const handleInputChange = (newValue: string) => {
    const formatted = formatInputWithРазделителями(newValue);
    setDisplayValue(formatted);
    onChange(String(parseFormattedInput(formatted)));
  };

  const handleVoiceResult = (result: { type: "expense" | "income"; amount: number; category: string; note?: string }) => {
    handleInputChange(String(result.amount));
    // We can't easily trigger the parent's onIncome/onExpense modals here without exposing them or using a timeout
    // Actually they are passed as props, so we can call them.
    if (result.type === "income") {
      onIncome?.();
    } else {
      onExpense?.();
    }
  };


  return (
    <Card className="overflow-hidden" data-onboarding="amount-input" variant="default">
      <CardContent className="pb-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm text-[var(--muted)]">{t("amountInput.caption")}</p>
            <p className="m-0 mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              {value ? `${Number(value).toLocaleString("ru-RU")} ${getCurrencySymbol(currency as CurrencyCode)}` : t("amountInput.title")}
              {value && isDifferentCurrency && (
                <span className="ml-2 text-sm font-normal text-[var(--muted)]">
                  ≈ {formatMoney(convertedValue, baseCurrency)}
                </span>
              )}
            </p>

          </div>
          <VoiceAssistant onResult={handleVoiceResult} />
        </div>

        <div className="relative">
          <Input
            className="rounded-[24px] text-lg font-semibold tracking-[-0.03em]"
            style={{ paddingRight: "2.5rem" }}
            fullWidth
            max={String(MAX_FINANCE_AMOUNT)}
            min="0"
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder="0"
            step="1"
            type="text"
            value={displayValue}
            variant="secondary"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {displayValue && (
              <button
                className="finance-input-clear flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-tertiary)] hover:text-[var(--foreground)]"
                onClick={() => handleInputChange("")}
                type="button"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowCurrencyModal(true)}
              type="button"
              className="flex items-center gap-1 px-2 py-1 bg-[var(--surface-tertiary)] rounded-full text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              {currency}
            </button>
          </div>
        </div>

        <Modal>
          <ModalBackdrop
            isOpen={showCurrencyModal}
            onOpenChange={setShowCurrencyModal}
            variant="blur"
          >
            <ModalContainer size="sm">
              <ModalDialog>
                <ModalCloseTrigger />
                <ModalHeader>
                  <ModalHeading>{t("settings.currencyModalTitle")}</ModalHeading>
                </ModalHeader>
                <ModalBody>
                  <div className="grid grid-cols-2 gap-2">
                    {(["USD", "EUR", "RUB", "UZS", "KZT", "TRY", "GBP", "CNY"] as CurrencyCode[]).map((curr) => (
                      <Button
                        key={curr}
                        variant={currency === curr ? "primary" : "secondary"}
                        onPress={() => {
                          onCurrencyChange(curr);
                          setShowCurrencyModal(false);
                        }}
                      >
                        {curr}
                      </Button>
                    ))}
                  </div>
                </ModalBody>
              </ModalDialog>
            </ModalContainer>
          </ModalBackdrop>
        </Modal>


        {helperText ? (
          <p className="mt-2 text-xs text-[var(--danger)]">{helperText}</p>
        ) : null}
      </CardContent>

      <CardFooter>
        <div className="flex w-full flex-col gap-3">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button className="w-full justify-start px-5" isDisabled={isIncomeDisabled} onPress={onIncome} variant="primary">
              <ArrowUpRightIcon className="h-4 w-4" />
              {t("dashboard.shortcuts.income")}
            </Button>
            <Button className="w-full justify-start px-5" isDisabled={isExpenseDisabled} onPress={onExpense} variant="secondary">
              <ArrowDownLeftIcon className="h-4 w-4" />
              {t("dashboard.shortcuts.expense")}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
