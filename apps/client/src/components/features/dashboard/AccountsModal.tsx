import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Account, CryptoCode, CryptoHolding, CurrencyCode } from "@finance-twa/shared-types";
import { CRYPTO_CODES } from "@finance-twa/shared-types";
import { Button, Input, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody, Select } from "@/components/ui";
import { formatMoney } from "@/utils/format";
import { cryptoHoldingValueUsd, cryptoHoldingsTotalUsd } from "@/utils/exchange-rates";
import { BanknotesIcon, CreditCardIcon, CircleStackIcon, PlusIcon, ArrowPathIcon, PencilIcon, TrashIcon } from "@/components/layout/icons";

type AccountType = "cash" | "card" | "crypto";

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  rates: Record<CurrencyCode, number>;
  onCreateAccount: (name: string, type: AccountType, currency: string, initialBalance: number, holdings?: CryptoHolding[]) => Promise<unknown>;
  onUpdateAccount: (accountId: string, name: string) => Promise<unknown>;
  onDeleteAccount: (accountId: string) => Promise<unknown>;
  onSetCryptoHolding: (accountId: string, symbol: CryptoCode, amount: number) => Promise<unknown>;
  onTransfer: (params: { fromAccountId: string; toAccountId: string; amount: number; toAmount?: number }) => Promise<unknown>;
}

type ModalView = "list" | "create" | "edit" | "transfer" | "holdings";

const fiatCurrencies: CurrencyCode[] = ["UZS", "RUB", "USD", "EUR", "KZT", "TRY", "GBP", "CNY"];

const CRYPTO_LABELS: Record<CryptoCode, string> = {
  BTC: "Bitcoin",
  TON: "Toncoin",
  USDT: "Tether",
  NOTCOIN: "Notcoin",
  ETH: "Ethereum",
};

function getHoldingAmount(holdings: CryptoHolding[] | undefined, symbol: CryptoCode): number {
  return holdings?.find((h) => h.symbol === symbol)?.amount ?? 0;
}

export function AccountsModal({
  isOpen,
  onClose,
  accounts,
  rates,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSetCryptoHolding,
  onTransfer,
}: AccountsModalProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<ModalView>("list");

  // Create account state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AccountType>("cash");
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>("UZS");
  const [initialBalance, setInitialBalance] = useState("");

  // Edit account state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");

  // Crypto holdings state
  const [holdingsAccount, setHoldingsAccount] = useState<Account | null>(null);
  const [holdingSymbol, setHoldingSymbol] = useState<CryptoCode>("BTC");
  const [holdingAmount, setHoldingAmount] = useState("");

  // Transfer state
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferToAmount, setTransferToAmount] = useState(""); // optional manual target amount

  const [isPending, setIsPending] = useState(false);

  const fiatAccounts = accounts.filter((acc) => acc.type !== "crypto");

  function resetCreateForm() {
    setNewName("");
    setNewType("cash");
    setNewCurrency("UZS");
    setInitialBalance("");
  }

  function resetTransferForm() {
    setFromAccountId(fiatAccounts[0]?.id ?? "");
    setToAccountId(fiatAccounts[1]?.id ?? "");
    setTransferAmount("");
    setTransferToAmount("");
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsPending(true);
    try {
      await onCreateAccount(
        newName.trim(),
        newType,
        newType === "crypto" ? "USD" : newCurrency,
        newType === "crypto" ? 0 : Number(initialBalance) || 0,
        newType === "crypto" ? [] : undefined,
      );
      resetCreateForm();
      setView("list");
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  }

  async function handleUpdate() {
    if (!editingAccount || !editName.trim()) return;
    setIsPending(true);
    try {
      await onUpdateAccount(editingAccount.id, editName.trim());
      setView("list");
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!editingAccount) return;
    if (accounts.length <= 1) return;
    setIsPending(true);
    try {
      await onDeleteAccount(editingAccount.id);
      setView("list");
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  }

  async function handleSetHolding() {
    if (!holdingsAccount) return;
    const amount = Number(holdingAmount);
    if (!Number.isFinite(amount) || amount < 0) return;
    setIsPending(true);
    try {
      await onSetCryptoHolding(holdingsAccount.id, holdingSymbol, amount);
      setHoldingAmount("");
      // Reflect the change locally so the editor stays in sync.
      setHoldingsAccount((prev) => {
        if (!prev) return prev;
        const without = (prev.holdings ?? []).filter((h) => h.symbol !== holdingSymbol);
        const next = amount > 0 ? [...without, { symbol: holdingSymbol, amount }] : without;
        return { ...prev, holdings: next };
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  }

  async function handleTransfer() {
    if (!fromAccountId || !toAccountId || !transferAmount || fromAccountId === toAccountId) return;
    setIsPending(true);
    try {
      await onTransfer({
        fromAccountId,
        toAccountId,
        amount: Number(transferAmount),
        toAmount: transferToAmount ? Number(transferToAmount) : undefined,
      });
      resetTransferForm();
      setView("list");
    } catch (e) {
      console.error(e);
    } finally {
      setIsPending(false);
    }
  }

  function getAccountEmoji(type: AccountType) {
    switch (type) {
      case "cash": return "💵";
      case "card": return "💳";
      case "crypto": return "🪙";
      default: return "💰";
    }
  }

  function getAccountIcon(type: AccountType) {
    switch (type) {
      case "cash": return <BanknotesIcon className="h-5 w-5 text-[var(--muted)]" />;
      case "card": return <CreditCardIcon className="h-5 w-5 text-[var(--muted)]" />;
      case "crypto": return <CircleStackIcon className="h-5 w-5 text-[var(--muted)]" />;
      default: return <BanknotesIcon className="h-5 w-5 text-[var(--muted)]" />;
    }
  }

  return (
    <Modal>
      <ModalBackdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setView("list");
            onClose();
          }
        }}
        variant="blur"
      >
        <ModalContainer size="md">
          <ModalDialog>
            <ModalCloseTrigger />
            <ModalHeader>
              <ModalHeading>
                {view === "list" && t("accounts.title", { defaultValue: "My Accounts" })}
                {view === "create" && t("accounts.newAccount", { defaultValue: "New Account" })}
                {view === "edit" && t("accounts.editAccount", { defaultValue: "Edit Account" })}
                {view === "transfer" && t("accounts.transferBetween", { defaultValue: "Transfer Funds" })}
                {view === "holdings" && t("accounts.manageHoldings", { defaultValue: "Crypto Holdings" })}
              </ModalHeading>
            </ModalHeader>
            <ModalBody className="pb-6">
              {view === "list" && (
                <div className="space-y-4">
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 rounded-[16px] bg-[var(--surface-secondary)]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--surface-tertiary)]">
                              {getAccountIcon(acc.type)}
                            </span>
                            <div>
                              <p className="m-0 font-semibold text-sm text-[var(--foreground)]">{acc.name}</p>
                              <p className="m-0 text-xs text-[var(--muted)] capitalize">
                                {t(`accounts.type.${acc.type}`, { defaultValue: acc.type })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--foreground)]">
                              {acc.type === "crypto"
                                ? formatMoney(cryptoHoldingsTotalUsd(acc.holdings, rates), "USD")
                                : formatMoney(acc.balance, acc.currency)}
                            </span>
                            {acc.type === "crypto" && (
                              <button
                                onClick={() => {
                                  setHoldingsAccount(acc);
                                  setHoldingSymbol("BTC");
                                  setHoldingAmount("");
                                  setView("holdings");
                                }}
                                className="p-2 text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-full transition-colors outline-none text-xs flex items-center justify-center"
                                type="button"
                                aria-label={t("accounts.manageHoldings", { defaultValue: "Crypto Holdings" })}
                              >
                                <CircleStackIcon className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingAccount(acc);
                                setEditName(acc.name);
                                setView("edit");
                              }}
                              className="p-2 text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-full transition-colors outline-none text-xs flex items-center justify-center"
                              type="button"
                              aria-label={t("accounts.editAccount", { defaultValue: "Edit Account" })}
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {acc.type === "crypto" && (acc.holdings?.length ?? 0) > 0 && (
                          <div className="mt-2 pl-[52px] space-y-1">
                            {acc.holdings!.map((h) => (
                              <div key={h.symbol} className="flex items-center justify-between text-xs text-[var(--muted)]">
                                <span className="font-medium text-[var(--foreground)]">
                                  {h.amount} {h.symbol}
                                </span>
                                <span>{formatMoney(cryptoHoldingValueUsd(h.symbol, h.amount, rates), "USD")}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                      onPress={() => {
                        resetCreateForm();
                        setView("create");
                      }}
                      variant="secondary"
                      className="w-full"
                    >
                      <PlusIcon className="h-4 w-4 mr-1 inline-block" />
                      <span>{t("accounts.addBtn", { defaultValue: "Create Account" })}</span>
                    </Button>
                    <Button
                      onPress={() => {
                        resetTransferForm();
                        setView("transfer");
                      }}
                      variant="primary"
                      className="w-full"
                      isDisabled={fiatAccounts.length < 2}
                    >
                      <ArrowPathIcon className="h-4 w-4 mr-1 inline-block" />
                      <span>{t("accounts.transferBtn", { defaultValue: "Transfer" })}</span>
                    </Button>
                  </div>
                </div>
              )}

              {view === "create" && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-[var(--muted)]">
                    {t("accounts.fieldName", { defaultValue: "Account Name" })}
                    <Input
                      fullWidth
                      className="mt-1"
                      placeholder={t("accounts.namePlaceholder", { defaultValue: "My Wallet, Savings Card, etc." })}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      variant="secondary"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-semibold text-[var(--muted)]">
                      {t("accounts.fieldType", { defaultValue: "Type" })}
                      <Select
                        fullWidth
                        className="mt-1"
                        value={newType}
                        onChange={(e) => setNewType(e.target.value as AccountType)}
                        variant="secondary"
                      >
                        <option value="cash">{t("accounts.type.cash", { defaultValue: "Cash" })}</option>
                        <option value="card">{t("accounts.type.card", { defaultValue: "Card" })}</option>
                        <option value="crypto">{t("accounts.type.crypto", { defaultValue: "Crypto" })}</option>
                      </Select>
                    </label>

                    {newType !== "crypto" && (
                      <label className="block text-xs font-semibold text-[var(--muted)]">
                        {t("accounts.fieldCurrency", { defaultValue: "Currency" })}
                        <Select
                          fullWidth
                          className="mt-1"
                          value={newCurrency}
                          onChange={(e) => setNewCurrency(e.target.value as CurrencyCode)}
                          variant="secondary"
                        >
                          {fiatCurrencies.map((curr) => (
                            <option key={curr} value={curr}>{curr}</option>
                          ))}
                        </Select>
                      </label>
                    )}
                  </div>

                  {newType === "crypto" ? (
                    <p className="m-0 text-xs text-[var(--muted)] rounded-[12px] bg-[var(--surface-secondary)] px-3 py-2">
                      {t("accounts.cryptoCreateHint", {
                        defaultValue: "Create the wallet first, then add coins (BTC, TON, USDT, NOTCOIN) from the holdings editor.",
                      })}
                    </p>
                  ) : (
                    <label className="block text-xs font-semibold text-[var(--muted)]">
                      {t("accounts.fieldInitialBalance", { defaultValue: "Initial Balance" })}
                      <Input
                        fullWidth
                        className="mt-1"
                        type="number"
                        placeholder="0"
                        value={initialBalance}
                        onChange={(e) => setInitialBalance(e.target.value)}
                        variant="secondary"
                      />
                    </label>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <Button
                      onPress={() => setView("list")}
                      variant="secondary"
                      isDisabled={isPending}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onPress={handleCreate}
                      variant="primary"
                      isDisabled={isPending || !newName.trim()}
                    >
                      {t("common.create", { defaultValue: "Create" })}
                    </Button>
                  </div>
                </div>
              )}

              {view === "edit" && editingAccount && (
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-[var(--muted)]">
                    {t("accounts.fieldName", { defaultValue: "Account Name" })}
                    <Input
                      fullWidth
                      className="mt-1"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      variant="secondary"
                    />
                  </label>

                  <div className="pt-3 space-y-2">
                    <Button
                      onPress={handleUpdate}
                      variant="primary"
                      className="w-full"
                      isDisabled={isPending || !editName.trim()}
                    >
                      {t("common.save")}
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onPress={() => setView("list")}
                        variant="secondary"
                        isDisabled={isPending}
                      >
                        {t("common.back", { defaultValue: "Back" })}
                      </Button>
                      <Button
                        onPress={handleDelete}
                        variant="danger-soft"
                        isDisabled={isPending || accounts.length <= 1}
                      >
                        <TrashIcon className="h-4 w-4 mr-1 inline-block" />
                        <span>{t("common.delete")}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {view === "holdings" && holdingsAccount && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="m-0 text-sm font-semibold text-[var(--foreground)]">{holdingsAccount.name}</p>
                    <span className="text-sm font-bold text-[var(--foreground)]">
                      {formatMoney(cryptoHoldingsTotalUsd(holdingsAccount.holdings, rates), "USD")}
                    </span>
                  </div>

                  <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
                    {CRYPTO_CODES.map((code) => {
                      const amount = getHoldingAmount(holdingsAccount.holdings, code);
                      return (
                        <div
                          key={code}
                          className="flex items-center justify-between px-3 py-2 rounded-[12px] bg-[var(--surface-secondary)]"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-[var(--foreground)]">{code}</span>
                            <span className="text-[11px] text-[var(--muted)]">{CRYPTO_LABELS[code]}</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-medium text-[var(--foreground)]">{amount > 0 ? amount : "—"}</span>
                            {amount > 0 && (
                              <span className="text-[11px] text-[var(--muted)]">
                                {formatMoney(cryptoHoldingValueUsd(code, amount, rates), "USD")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="block text-xs font-semibold text-[var(--muted)]">
                      {t("accounts.coin", { defaultValue: "Coin" })}
                      <Select
                        fullWidth
                        className="mt-1"
                        value={holdingSymbol}
                        onChange={(e) => {
                          const symbol = e.target.value as CryptoCode;
                          setHoldingSymbol(symbol);
                          const existing = getHoldingAmount(holdingsAccount.holdings, symbol);
                          setHoldingAmount(existing > 0 ? String(existing) : "");
                        }}
                        variant="secondary"
                      >
                        {CRYPTO_CODES.map((code) => (
                          <option key={code} value={code}>{code} · {CRYPTO_LABELS[code]}</option>
                        ))}
                      </Select>
                    </label>

                    <label className="block text-xs font-semibold text-[var(--muted)]">
                      {t("accounts.coinAmount", { defaultValue: "Amount" })}
                      <Input
                        fullWidth
                        className="mt-1"
                        type="number"
                        placeholder="0"
                        value={holdingAmount}
                        onChange={(e) => setHoldingAmount(e.target.value)}
                        variant="secondary"
                      />
                    </label>
                  </div>

                  <Button
                    onPress={handleSetHolding}
                    variant="primary"
                    className="w-full"
                    isDisabled={isPending || holdingAmount.trim() === ""}
                  >
                    {t("accounts.saveHolding", { defaultValue: "Save Coin" })}
                  </Button>

                  <Button
                    onPress={() => setView("list")}
                    variant="secondary"
                    className="w-full"
                    isDisabled={isPending}
                  >
                    {t("common.back", { defaultValue: "Back" })}
                  </Button>
                </div>
              )}

              {view === "transfer" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-semibold text-[var(--muted)]">
                      {t("accounts.transferFrom", { defaultValue: "From Account" })}
                      <Select
                        fullWidth
                        className="mt-1"
                        value={fromAccountId}
                        onChange={(e) => setFromAccountId(e.target.value)}
                        variant="secondary"
                      >
                        {fiatAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {getAccountEmoji(acc.type)} {acc.name} ({acc.currency})
                          </option>
                        ))}
                      </Select>
                    </label>

                    <label className="block text-xs font-semibold text-[var(--muted)]">
                      {t("accounts.transferTo", { defaultValue: "To Account" })}
                      <Select
                        fullWidth
                        className="mt-1"
                        value={toAccountId}
                        onChange={(e) => setToAccountId(e.target.value)}
                        variant="secondary"
                      >
                        {fiatAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {getAccountEmoji(acc.type)} {acc.name} ({acc.currency})
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <label className="block text-xs font-semibold text-[var(--muted)]">
                      {t("accounts.transferAmount", { defaultValue: "Send Amount" })}
                      <Input
                        fullWidth
                        className="mt-1"
                        type="number"
                        placeholder="0"
                        value={transferAmount}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        variant="secondary"
                      />
                    </label>

                    <label className="block text-xs font-semibold text-[var(--muted)]">
                      {t("accounts.transferToAmount", { defaultValue: "Receive Amount (Optional)" })}
                      <Input
                        fullWidth
                        className="mt-1"
                        type="number"
                        placeholder={t("accounts.transferAutoPlaceholder", { defaultValue: "Automatic" })}
                        value={transferToAmount}
                        onChange={(e) => setTransferToAmount(e.target.value)}
                        variant="secondary"
                      />
                    </label>
                  </div>

                  {fromAccountId === toAccountId && (
                    <p className="text-xs text-[var(--danger)] m-0">
                      {t("accounts.transferErrorSame", { defaultValue: "Cannot transfer to the same account" })}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-3">
                    <Button
                      onPress={() => setView("list")}
                      variant="secondary"
                      isDisabled={isPending}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onPress={handleTransfer}
                      variant="primary"
                      isDisabled={isPending || !transferAmount || fromAccountId === toAccountId}
                    >
                      {t("accounts.executeTransfer", { defaultValue: "Transfer" })}
                    </Button>
                  </div>
                </div>
              )}
            </ModalBody>
          </ModalDialog>
        </ModalContainer>
      </ModalBackdrop>
    </Modal>
  );
}
