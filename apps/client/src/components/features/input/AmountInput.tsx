import { Button, Card, CardContent, CardFooter, Input } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { ArrowDownLeftIcon, ArrowUpRightIcon, XMarkIcon } from "@/components/layout/icons";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onIncome?: () => void;
  onExpense?: () => void;
  isIncomeDisabled?: boolean;
  isExpenseDisabled?: boolean;
}

const quickAmounts = [50000, 100000, 200000, 500000];

function formatQuickAmount(amount: number): string {
  return amount >= 1000 ? `+${amount / 1000}k` : `+${amount}`;
}

export function AmountInput({ value, onChange, onIncome, onExpense, isIncomeDisabled, isExpenseDisabled }: AmountInputProps) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden" variant="default">
      <CardContent>
        <div className="relative">
          <Input
            className="rounded-full"
            style={{ paddingRight: "2.5rem" }}
            fullWidth
            min="0"
            onChange={(event) => onChange(event.target.value)}
            placeholder="0.00"
            step="0.01"
            type="number"
            value={value}
            variant="secondary"
          />
          {value && (
            <button
              className="finance-input-clear absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-tertiary)] hover:text-[var(--foreground)]"
              onClick={() => onChange("")}
              type="button"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </CardContent>

      <CardFooter>
        <div className="flex w-full flex-col gap-3">
          <div className="grid w-full grid-cols-4 gap-2">
            {quickAmounts.map((amount) => (
              <Button key={amount} className="w-full rounded-full" onPress={() => onChange(String(amount))} variant="secondary">
                {formatQuickAmount(amount)}
              </Button>
            ))}
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Button className="w-full" isDisabled={isIncomeDisabled} onPress={onIncome} variant="primary">
              <ArrowUpRightIcon className="h-4 w-4" />
              {t("dashboard.shortcuts.income")}
            </Button>
            <Button className="w-full" isDisabled={isExpenseDisabled} onPress={onExpense} variant="secondary">
              <ArrowDownLeftIcon className="h-4 w-4" />
              {t("dashboard.shortcuts.expense")}
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
