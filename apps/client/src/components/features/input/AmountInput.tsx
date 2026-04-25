import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ArrowDownLeftIcon, ArrowUpRightIcon, XMarkIcon } from "@/components/layout/icons";
import { Button, Card, CardContent, CardFooter, Input } from "@/components/ui";
import { formatInputWithРазделителями, parseFormattedInput, getCurrencySymbol } from "@/utils/format";
import { MAX_FINANCE_AMOUNT } from "@finance-twa/shared-types";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onIncome?: () => void;
  onExpense?: () => void;
  isIncomeDisabled?: boolean;
  isExpenseDisabled?: boolean;
  helperText?: string;
}

export function AmountInput({ value, onChange, onIncome, onExpense, isIncomeDisabled, isExpenseDisabled, helperText }: AmountInputProps) {
  const { t } = useTranslation();
  const [displayValue, setDisplayValue] = useState(formatInputWithРазделителями(value));

  const handleInputChange = (newValue: string) => {
    const formatted = formatInputWithРазделителями(newValue);
    setDisplayValue(formatted);
    onChange(String(parseFormattedInput(formatted)));
  };

  return (
    <Card className="overflow-hidden" data-onboarding="amount-input" variant="default">
      <CardContent className="pb-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="m-0 text-sm text-[var(--muted)]">{t("amountInput.caption")}</p>
            <p className="m-0 mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              {value ? `${Number(value).toLocaleString("ru-RU")} ${getCurrencySymbol()}` : t("amountInput.title")}
            </p>
          </div>
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
          {displayValue && (
            <button
              className="finance-input-clear absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-tertiary)] hover:text-[var(--foreground)]"
              onClick={() => handleInputChange("")}
              type="button"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
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
