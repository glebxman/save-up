import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmActionModal } from "@/components/features/shared/ConfirmActionModal";
import { SettingsIcon } from "@/components/layout/icons";
import { Card, CardContent } from "@/components/ui";
import { useCountUp } from "@/hooks/useCountUp";
import { useTelegram } from "@/hooks/useTelegram";
import { hapticImpact, hapticNotification } from "@/utils/haptic";
import { formatMoney, parseAmount } from "@/utils/format";
import { cryptoHoldingsTotalUsd } from "@/utils/exchange-rates";
import { MAX_FINANCE_AMOUNT } from "@finance-twa/shared-types";

import type { Account } from "@finance-twa/shared-types";

interface BalanceCardProps {
  balance: number;
  monthlyExp: number;
  isBalanceSaving?: boolean;
  onBalanceChange?: (balance: number) => Promise<unknown> | unknown;
  accounts?: Account[];
  onManageAccounts?: () => void;
}

function formatWithSpaces(value: number): string {
  return Math.floor(value).toLocaleString("en-US");
}

/** Minimum horizontal distance (px) before we commit to a page change. */
const SWIPE_MIN_DISTANCE = 50;

export function BalanceCard({
  balance,
  monthlyExp,
  isBalanceSaving,
  onBalanceChange,
  accounts = [],
  onManageAccounts,
}: BalanceCardProps) {
  const { t } = useTranslation();
  const { user } = useTelegram();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipNextBlurRef = useRef(false);
  const pendingModalTimeoutRef = useRef<number | null>(null);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceDraft, setBalanceDraft] = useState(formatWithSpaces(balance));
  const [pendingBalance, setPendingBalance] = useState<number | null>(null);

  const [page, setPage] = useState(0);

  const isHealthy = balance >= monthlyExp;
  const spendableNow = Math.max(balance - monthlyExp, 0);
  const animatedBalance = useCountUp(balance, !isEditingBalance && page === 0);

  const pageCount = accounts.length + 2;
  const activeAccount = (page > 0 && page < pageCount - 1) ? (accounts[page - 1] ?? null) : null;

  // ─── Touch-based swipe ─────────────────────────────────────────────────
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchState = useRef<{
    startX: number;
    startY: number;
    currentX: number;
    isDragging: boolean;     // true once we confirmed horizontal intent
    isDecided: boolean;      // true once direction is determined (h or v)
  } | null>(null);

  const goToPage = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(pageCount - 1, next));
    if (clamped === page) return;
    setPage(clamped);
    hapticImpact("light");
  }, [page, pageCount]);

  // Snap the track to the current page with a CSS transition.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)";
    el.style.transform = `translateX(-${page * 100}%)`;
  }, [page]);

  // If account list changes and page is out of range, reset.
  useEffect(() => {
    if (page >= pageCount) {
      setPage(0);
    }
  }, [accounts.length, page, pageCount]);

  // Attach touch handlers manually to support preventDefault() in non-passive touchmove
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (pageCount <= 1 || isEditingBalance) return;
      const touch = e.touches[0];
      if (!touch) return;

      // Remove transition so the track follows the finger immediately.
      const el = trackRef.current;
      if (el) el.style.transition = "none";

      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        isDragging: false,
        isDecided: false,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const state = touchState.current;
      const el = trackRef.current;
      if (!state || !el) return;

      const touch = e.touches[0];
      if (!touch) return;

      state.currentX = touch.clientX;
      const dx = touch.clientX - state.startX;
      const dy = touch.clientY - state.startY;

      // First few pixels — determine intent: horizontal swipe or vertical scroll.
      if (!state.isDecided) {
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        // Need at least 8px of movement to decide.
        if (absDx < 8 && absDy < 8) return;

        if (absDx > absDy) {
          // Horizontal intent — we own this gesture.
          state.isDragging = true;
          state.isDecided = true;
        } else {
          // Vertical intent — let the browser scroll.
          state.isDecided = true;
          state.isDragging = false;
          return;
        }
      }

      if (!state.isDragging) return;

      // Prevent vertical scroll while we're swiping horizontally.
      if (e.cancelable) {
        e.preventDefault();
      }

      // Clamp at edges with rubber-band effect.
      let offset = dx;
      if ((page === 0 && dx > 0) || (page === pageCount - 1 && dx < 0)) {
        offset = dx * 0.25; // rubber band
      }

      const pct = -(page * 100) + (offset / container.offsetWidth) * 100;
      el.style.transform = `translateX(${pct}%)`;
    };

    const onTouchEnd = () => {
      const state = touchState.current;
      const el = trackRef.current;
      touchState.current = null;
      if (!state || !el) return;

      // Restore the CSS transition for the snap animation.
      el.style.transition = "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)";

      if (!state.isDragging) {
        // Wasn't a horizontal swipe — snap back.
        el.style.transform = `translateX(-${page * 100}%)`;
        return;
      }

      const dx = state.currentX - state.startX;

      if (dx < -SWIPE_MIN_DISTANCE && page < pageCount - 1) {
        goToPage(page + 1);
      } else if (dx > SWIPE_MIN_DISTANCE && page > 0) {
        goToPage(page - 1);
      } else {
        // Snap back to current page.
        el.style.transform = `translateX(-${page * 100}%)`;
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [page, pageCount, isEditingBalance, goToPage]);

  // ─── Balance editing ───────────────────────────────────────────────────

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
    if (!onBalanceChange || isBalanceSaving || page !== 0) {
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
    if (isBalanceSaving) return;
    setPendingBalance(null);
    setBalanceDraft(formatWithSpaces(balance));
  }

  function confirmPendingBalanceChange(): void {
    if (pendingBalance === null || !onBalanceChange || isBalanceSaving) return;

    void Promise.resolve(onBalanceChange(pendingBalance))
      .then(() => {
        setPendingBalance(null);
        hapticNotification("success");
      })
      .catch(() => undefined);
  }

  function accountValue(acc: Account): { value: number; currency: Account["currency"] } {
    if (acc.type === "crypto") {
      return { value: cryptoHoldingsTotalUsd((acc as any).holdings), currency: "USD" };
    }
    return { value: acc.balance, currency: acc.currency };
  }

  // Returns custom gradients for different cards/account types
  function getCardBg(pageIndex: number, acc: Account | null): string {
    if (pageIndex === 0) {
      // Main Wallet card: deep gold & dark metallic shine
      return "radial-gradient(circle at 80% 20%, rgba(239, 240, 158, 0.15), transparent 50%), linear-gradient(135deg, #1f2023 0%, #0d0e10 100%)";
    }
    if (!acc) return "linear-gradient(135deg, #1c1d24 0%, #0c0d10 100%)";

    switch (acc.type) {
      case "card":
        // Card type: midnight blue credit card look
        return "radial-gradient(circle at 80% 20%, rgba(96, 132, 255, 0.12), transparent 50%), linear-gradient(135deg, #161822 0%, #07080d 100%)";
      case "crypto":
        // Crypto type: premium dark purple gradient
        return "radial-gradient(circle at 80% 20%, rgba(231, 197, 222, 0.12), transparent 50%), linear-gradient(135deg, #20172a 0%, #08050e 100%)";
      default:
        // Cash type: deep forest green gradient
        return "radial-gradient(circle at 80% 20%, rgba(60, 173, 139, 0.12), transparent 50%), linear-gradient(135deg, #111e1a 0%, #050a08 100%)";
    }
  }

  // Mastercard logo or type-specific indicator
  function getCardLogo(pageIndex: number, acc: Account | null) {
    if (pageIndex === 0 || (acc && acc.type === "card")) {
      return (
        <div className="flex items-center -space-x-1.5 opacity-90 select-none">
          <div className="h-5 w-5 rounded-full bg-[#EB001B]" />
          <div className="h-5 w-5 rounded-full bg-[#F79E1B]" />
        </div>
      );
    }
    if (acc && acc.type === "crypto") {
      return (
        <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center select-none">
          <span className="text-[10px] font-bold text-white font-sans">₿</span>
        </div>
      );
    }
    // Cash
    return (
      <div className="h-5 w-5 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center select-none">
        <span className="text-[10px] font-bold text-white font-sans">$</span>
      </div>
    );
  }

  const displayName = user
    ? [user.first_name, user.last_name].filter(Boolean).join(" ")
    : t("common.defaultUser", { defaultValue: "User" });

  // ─── Render helpers ────────────────────────────────────────────────────

  function renderCard(pageIndex: number) {
    const isAdd = pageIndex === pageCount - 1;
    const acc = (pageIndex > 0 && pageIndex < pageCount - 1) ? (accounts[pageIndex - 1] ?? null) : null;

    return (
      <div
        key={pageIndex}
        className="w-full shrink-0"
        style={{ height: "12rem" }}
      >
        <div
          className={`relative h-full w-full p-6 flex flex-col justify-between select-none ${
            isAdd
              ? "bg-[var(--surface-secondary)] border-2 border-dashed border-[var(--separator)] text-[var(--foreground)]"
              : "text-white border border-white/5"
          }`}
          style={{
            borderRadius: "24px",
            ...(isAdd ? {} : { background: getCardBg(pageIndex, acc) })
          }}
        >
          {isAdd ? (
            <div
              className="flex flex-col items-center justify-center h-full w-full space-y-3 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onManageAccounts?.();
              }}
            >
              <div className="h-14 w-14 rounded-full bg-[var(--surface-tertiary)] flex items-center justify-center border border-[var(--separator)] hover:bg-[var(--surface-secondary)] transition active:scale-95 shadow-md">
                <span className="text-3xl font-light text-[var(--foreground)] leading-none">+</span>
              </div>
              <span className="text-sm text-[var(--muted)] font-semibold tracking-wide">
                {t("accounts.newAccount", { defaultValue: "New Account" })}
              </span>
            </div>
          ) : (
            <>
              {/* Header row: Label & Add/Manage Icon */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-bold font-sans">
                    {pageIndex === 0 ? t("balance.walletLabel", { defaultValue: "Wallet" }) : t(`accounts.type.${acc?.type || 'card'}`)}
                  </span>
                  <h3 className="text-base font-semibold text-white/90 mt-0.5 tracking-tight truncate max-w-[200px]">
                    {pageIndex === 0 ? displayName : acc?.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManageAccounts?.();
                  }}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 transition active:scale-95 border border-white/5"
                  aria-label={t("accounts.manage", { defaultValue: "Manage" })}
                >
                  <SettingsIcon className="h-4 w-4 text-white" />
                </button>
              </div>

              {/* Footer row: Balance & Brand details */}
              <div className="flex justify-between items-end">
                <div className="flex-1 min-w-0 pr-4">
                  {pageIndex === 0 ? (
                    isEditingBalance ? (
                      <input
                        ref={inputRef}
                        aria-label={t("balance.caption")}
                        className="m-0 block w-full min-w-0 rounded-[10px] border border-white/20 bg-black/40 px-2 py-0.5 text-[1.8rem] font-bold leading-none text-white outline-none focus:border-white/40"
                        disabled={isBalanceSaving}
                        inputMode="numeric"
                        max={String(MAX_FINANCE_AMOUNT)}
                        min="0"
                        onBlur={commitBalanceEdit}
                        onChange={(event) => {
                          const rawValue = event.target.value.replace(/\D/g, "");
                          if (rawValue) {
                            setBalanceDraft(formatWithSpaces(parseInt(rawValue, 10)));
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
                        className="m-0 block text-[1.95rem] font-bold tracking-tight leading-none text-white outline-none cursor-text truncate text-left w-full"
                        disabled={!onBalanceChange || isBalanceSaving}
                        onClick={(e) => {
                          e.stopPropagation();
                          startBalanceEdit();
                        }}
                        type="button"
                      >
                        {formatMoney(animatedBalance)}
                      </button>
                    )
                  ) : acc ? (
                    <div className="text-[1.95rem] font-bold tracking-tight leading-none text-white truncate">
                      {formatMoney(accountValue(acc).value, accountValue(acc).currency)}
                    </div>
                  ) : null}

                  <span className="text-[10px] text-white/40 font-medium block mt-1">
                    {pageIndex === 0 ? t("balance.totalBalance", { defaultValue: "Total Balance" }) : `Account ** ${acc?.id.slice(-4)}`}
                  </span>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  {getCardLogo(pageIndex, acc)}
                  <span className="text-[10px] text-white/40 font-mono tracking-wider mt-1 block">
                    {pageIndex === 0 ? "**** 0000" : `**** ${acc?.id.slice(-4)}`}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full space-y-4" data-onboarding="balance">
        {/* Swipeable credit-card carousel container */}
        <div
          ref={containerRef}
          className="relative overflow-hidden rounded-[24px]"
          style={{ height: "12rem" }}
        >
          {/* Sliding track: all cards laid out side by side */}
          <div
            ref={trackRef}
            className="flex h-full"
            style={{
              width: "100%",
              transform: `translateX(-${page * 100}%)`,
              willChange: "transform",
            }}
          >
            {Array.from({ length: pageCount }).map((_, i) => renderCard(i))}
          </div>
        </div>

        {/* Carousel indicators */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: pageCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Page ${index + 1}`}
                onClick={() => goToPage(index)}
                className={`h-1.5 rounded-full transition-all ${index === page
                  ? "w-5 bg-[var(--foreground)]"
                  : "w-1.5 bg-[color-mix(in_srgb,var(--foreground)_30%,transparent)]"
                  }`}
              />
            ))}
          </div>
        )}

        {/* Secondary metrics (Spendable now & monthly budget) */}
        <div className="grid grid-cols-2 gap-2">
          <Card variant="default">
            <CardContent className="!p-4">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] truncate">{t("balance.spendableNow")}</p>
              <p className="m-0 mt-2 text-[1.5rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">{formatMoney(spendableNow)}</p>
            </CardContent>
          </Card>
          <Card variant="default">
            <CardContent className="!p-4">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] truncate">{t("balance.monthlyBudget")}</p>
              <p className="m-0 mt-2 text-[1.5rem] font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">{formatMoney(monthlyExp)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

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
