import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmActionModal } from "@/components/features/shared/ConfirmActionModal";
import { WalletIcon } from "@/components/layout/icons";
import { Card, CardContent } from "@/components/ui";
import { formatMoney } from "@/utils/format";
import { MAX_FINANCE_AMOUNT } from "@finance-twa/shared-types";

interface BalanceCardProps {
  balance: number;
  monthlyExp: number;
  isBalanceSaving?: boolean;
  onBalanceChange?: (balance: number) => Promise<unknown> | unknown;
}

function parseAmount(value: string): number {
  return Number(value.replace(/\s/g, "").replace(",", "."));
}

function formatWithSpaces(value: number): string {
  return Math.floor(value).toLocaleString("ru-RU");
}

export function BalanceCard({
  balance,
  monthlyExp,
  isBalanceSaving,
  onBalanceChange,
}: BalanceCardProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextBlurRef = useRef(false);
  const pendingModalTimeoutRef = useRef<number | null>(null);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState(formatWithSpaces(balance));
  const [pendingBalance, setPendingBalance] = useState<number | null>(null);
  const isHealthy = balance >= monthlyExp;
  const spendableNow = Math.max(balance - monthlyExp, 0);

  useEffect(() => {
    return () => {
      if (pendingModalTimeoutRef.current !== null) {
        window.clearTimeout(pendingModalTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isEditingBalance) {
      setBalanceDraft(formatWithSpaces(balance));
    }
  }, [balance, isEditingBalance]);

  useEffect(() => {
    if (isEditingBalance) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingBalance]);

  function startBalanceEdit(): void {
    if (!onBalanceChange || isBalanceSaving) {
      return;
    }

    setBalanceDraft(formatWithSpaces(balance));
    setIsEditingBalance(true);
  }

  function cancelBalanceEdit(): void {
    skipNextBlurRef.current = true;
    setBalanceDraft(formatWithSpaces(balance));
    setIsEditingBalance(false);
  }

  function openBalanceConfirmation(nextBalance: number): void {
    if (pendingModalTimeoutRef.current !== null) {
      window.clearTimeout(pendingModalTimeoutRef.current);
    }

    pendingModalTimeoutRef.current = window.setTimeout(() => {
      pendingModalTimeoutRef.current = null;
      setPendingBalance(nextBalance);
    }, 0);
  }

  function commitBalanceEdit(): void {
    if (skipNextBlurRef.current) {
      skipNextBlurRef.current = false;
      return;
    }

    const nextBalance = parseAmount(balanceDraft);
    const isValid = balanceDraft.trim().length > 0
      && Number.isFinite(nextBalance)
      && nextBalance >= 0
      && nextBalance <= MAX_FINANCE_AMOUNT;

    setIsEditingBalance(false);

    if (!isValid || nextBalance === balance) {
      setBalanceDraft(formatWithSpaces(balance));
      return;
    }

    openBalanceConfirmation(nextBalance);
  }

  function cancelPendingBalanceChange(): void {
    if (isBalanceSaving) {
      return;
    }

    setPendingBalance(null);
    setBalanceDraft(formatWithSpaces(balance));
  }

  function confirmPendingBalanceChange(): void {
    if (pendingBalance === null || !onBalanceChange || isBalanceSaving) {
      return;
    }

    void Promise.resolve(onBalanceChange(pendingBalance))
      .then(() => setPendingBalance(null))
      .catch(() => undefined);
  }

  return (
    <>
      <Card className="finance-hero-card overflow-hidden" data-onboarding="balance" variant="default">
        <CardContent>
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="max-w-[70%]">
                <p className="m-0 text-sm text-[var(--muted)]">{t("balance.caption")}</p>
                {isEditingBalance ? (
                  <input
                    ref={inputRef}
                    aria-label={t("balance.caption")}
                    className="m-0 mt-2 block w-full min-w-0 rounded-[14px] border border-[var(--field-border)] bg-[var(--field-background)] px-2 py-1 text-[2.2rem] font-semibold leading-none text-[var(--foreground)] outline-none transition focus:ring-2 focus:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)]"
                    disabled={isBalanceSaving}
                    inputMode="numeric"
                    max={String(MAX_FINANCE_AMOUNT)}
                    min="0"
                    onBlur={commitBalanceEdit}
                    onChange={(event) => {
                      const rawValue = event.target.value.replace(/\D/g, "");
                      if (rawValue) {
                        const numValue = parseInt(rawValue, 10);
                        setBalanceDraft(formatWithSpaces(numValue));
                      } else {
                        setBalanceDraft("");
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.blur();
                      }

                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelBalanceEdit();
                      }
                    }}
                    type="text"
                    value={balanceDraft}
                  />
                ) : (
                  <button
                    className="m-0 mt-2 block max-w-full cursor-text truncate rounded-[14px] px-0 text-left text-[2.2rem] font-semibold leading-none text-[var(--foreground)] outline-none transition focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--focus)_18%,transparent)]"
                    disabled={!onBalanceChange || isBalanceSaving}
                    onClick={startBalanceEdit}
                    type="button"
                  >
                    {formatMoney(balance)}
                  </button>
                )}
                <p className={`m-0 mt-2 text-sm font-medium ${isHealthy ? "text-[var(--hero-positive-text)]" : "text-[var(--warning)]"}`}>
                  {isHealthy ? t("balance.healthy") : t("balance.watch")}
                </p>
              </div>

              <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--hero-soft-surface)] text-[var(--foreground)]">
                <WalletIcon className="h-5 w-5" />
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[24px] bg-[var(--hero-soft-surface)] px-4 py-3">
                <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--hero-secondary-text)]">{t("balance.spendableNow")}</p>
                <p className="m-0 mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--hero-on-strong)]">{formatMoney(spendableNow)}</p>
              </div>
              <div className="rounded-[24px] bg-[var(--hero-soft-surface)] px-4 py-3">
                <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--hero-secondary-text)]">{t("balance.monthlyBudget")}</p>
                <p className="m-0 mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--hero-on-strong)]">{formatMoney(monthlyExp)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmActionModal
        cancelLabel={t("common.cancel")}
        confirmLabel={t("balance.changeConfirm")}
        description={
          pendingBalance === null
            ? undefined
            : t("balance.changeDescription", {
              current: formatMoney(balance),
              next: formatMoney(pendingBalance),
            })
        }
        isOpen={pendingBalance !== null}
        isPending={isBalanceSaving}
        onClose={cancelPendingBalanceChange}
        onConfirm={confirmPendingBalanceChange}
        question={t("balance.changeQuestion")}
        title={t("balance.changeTitle")}
      />
    </>
  );
}
