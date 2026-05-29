import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ArrowDownLeftIcon, ArrowUpRightIcon, XMarkIcon, BanknotesIcon, CreditCardIcon, CircleStackIcon } from "@/components/layout/icons";
import { Button, Card, CardContent, Input, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody } from "@/components/ui";

import { formatGroupedNumber, parseFormattedInput, formatMoney } from "@/utils/format";
import { useCurrency } from "@/hooks/useCurrency";
import { getConversionRate } from "@/utils/exchange-rates";
import { MAX_FINANCE_AMOUNT, type CurrencyCode } from "@finance-twa/shared-types";
import { VoiceAssistant } from "@/components/features/ai/VoiceAssistant";



import type { Account } from "@finance-twa/shared-types";

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
  accounts?: Account[];
  activeAccountId?: string | null;
  onActiveAccountChange?: (accountId: string) => void;
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
  accounts = [],
  activeAccountId,
  onActiveAccountChange,
}: AmountInputProps) {
  const { t } = useTranslation();
  const { currency: baseCurrency } = useCurrency();
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [displayValue, setDisplayValue] = useState(formatGroupedNumber(value));

  const activeAccount = accounts.find((acc) => acc.id === activeAccountId);
  const isCryptoAccount = activeAccount?.type === "crypto";
  const fiatCurrencies: CurrencyCode[] = ["USD", "EUR", "RUB", "UZS", "KZT", "TRY", "GBP", "CNY"];
  const cryptoCurrencies: CurrencyCode[] = ["TON", "BTC", "USDT", "NOTCOIN", "ETH"];
  const availableCurrencies = isCryptoAccount
    ? [...cryptoCurrencies, "USD" as CurrencyCode]
    : fiatCurrencies;

  const rate = getConversionRate(currency as CurrencyCode, baseCurrency);
  const convertedValue = Number(value) * rate;
  const isDifferentCurrency = currency !== baseCurrency;

  const handleInputChange = (newValue: string) => {
    const formatted = formatGroupedNumber(newValue);
    setDisplayValue(formatted);
    onChange(String(parseFormattedInput(formatted)));
  };

  const handleVoiceResult = (result: { type: "expense" | "income"; amount: number; category: string; note?: string }) => {
    handleInputChange(String(result.amount));
    if (result.type === "income") {      onIncome?.();
    } else {
      onExpense?.();
    }
  };

  return (
    <Card className="overflow-hidden" data-onboarding="amount-input" variant="default">
      <CardContent className="!p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
            {t("amountInput.caption")}
          </p>
          <span data-onboarding="voice-input">
            <VoiceAssistant onResult={handleVoiceResult} />
          </span>
        </div>

        {value && isDifferentCurrency ? (
          <p className="m-0 mb-2 text-xs text-[var(--muted)]">
            ≈ {formatMoney(convertedValue, baseCurrency)}
          </p>
        ) : null}

        <div className="relative">
          <Input
            className="rounded-[20px] text-2xl font-semibold tracking-[-0.04em]"
            style={{ paddingRight: "5.5rem" }}
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
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {displayValue && (
              <button
                aria-label={t("common.cancel")}
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
              className="flex items-center gap-1 px-2.5 py-1 bg-[var(--surface-tertiary)] rounded-full text-xs font-bold text-[var(--foreground)] transition active:opacity-80"
            >
              {currency}
            </button>
          </div>
        </div>

        {accounts.length > 0 && onActiveAccountChange && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {accounts.map((acc) => {
              const isActive = acc.id === activeAccountId;
              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    onActiveAccountChange(acc.id);
                    onCurrencyChange(acc.currency);
                  }}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all border outline-none cursor-pointer ${
                    isActive
                      ? "bg-[var(--focus)] border-[var(--focus)] text-[var(--accent-foreground)] shadow-sm"
                      : "bg-[var(--surface-secondary)] border-[var(--field-border)] text-[var(--foreground)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {acc.type === "cash" && <BanknotesIcon className="h-3.5 w-3.5" />}
                  {acc.type === "card" && <CreditCardIcon className="h-3.5 w-3.5" />}
                  {acc.type === "crypto" && <CircleStackIcon className="h-3.5 w-3.5" />}
                  <span>{acc.name}</span>
                  <span className="opacity-75">({acc.currency})</span>
                </button>
              );
            })}
          </div>
        )}

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
                    {availableCurrencies.map((curr) => (
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

        <div className="mt-3 grid w-full grid-cols-2 gap-2">
          <Button className="w-full justify-center" isDisabled={isIncomeDisabled} onPress={onIncome} size="sm" variant="primary">
            <ArrowUpRightIcon className="h-4 w-4" />
            {t("dashboard.shortcuts.income")}
          </Button>
          <Button className="w-full justify-center" isDisabled={isExpenseDisabled} onPress={onExpense} size="sm" variant="secondary">
            <ArrowDownLeftIcon className="h-4 w-4" />
            {t("dashboard.shortcuts.expense")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
