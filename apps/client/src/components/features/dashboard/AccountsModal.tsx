import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Account, CurrencyCode } from "@finance-twa/shared-types";
import { Button, Input, Modal, ModalBackdrop, ModalContainer, ModalDialog, ModalCloseTrigger, ModalHeader, ModalHeading, ModalBody, Select } from "@/components/ui";
import { formatMoney } from "@/utils/format";
import { BanknotesIcon, CreditCardIcon, CircleStackIcon, PlusIcon, ArrowPathIcon, PencilIcon, TrashIcon } from "@/components/layout/icons";

interface AccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onCreateAccount: (name: string, type: "cash" | "card" | "crypto", currency: string, initialBalance: number) => Promise<unknown>;
  onUpdateAccount: (accountId: string, name: string) => Promise<unknown>;
  onDeleteAccount: (accountId: string) => Promise<unknown>;
  onTransfer: (params: { fromAccountId: string; toAccountId: string; amount: number; toAmount?: number }) => Promise<unknown>;
}

type ModalView = "list" | "create" | "edit" | "transfer";

const supportedCurrencies: CurrencyCode[] = ["UZS", "RUB", "USD", "EUR", "KZT", "TRY", "GBP", "CNY", "BTC", "ETH", "TON", "USDT"];

export function AccountsModal({
  isOpen,
  onClose,
  accounts,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onTransfer,
}: AccountsModalProps) {
  const { t } = useTranslation();
  const [view, setView] = useState<ModalView>("list");

  // Create account state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<"cash" | "card" | "crypto">("cash");
  const [newCurrency, setNewCurrency] = useState<CurrencyCode>("UZS");
  const [initialBalance, setInitialBalance] = useState("");

  // Edit account state
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editName, setEditName] = useState("");

  // Transfer state
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferToAmount, setTransferToAmount] = useState(""); // optional manual target amount (e.g. for crypto manual exchange rates)

  const [isPending, setIsPending] = useState(false);

  function resetCreateForm() {
    setNewName("");
    setNewType("cash");
    setNewCurrency("UZS");
    setInitialBalance("");
  }

  function resetTransferForm() {
    setFromAccountId(accounts[0]?.id ?? "");
    setToAccountId(accounts[1]?.id ?? "");
    setTransferAmount("");
    setTransferToAmount("");
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setIsPending(true);
    try {
      await onCreateAccount(newName.trim(), newType, newCurrency, Number(initialBalance) || 0);
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

  function getAccountEmoji(type: "cash" | "card" | "crypto") {
    switch (type) {
      case "cash": return "💵";
      case "card": return "💳";
      case "crypto": return "🪙";
      default: return "💰";
    }
  }

  function getAccountIcon(type: "cash" | "card" | "crypto") {
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
              </ModalHeading>
            </ModalHeader>
            <ModalBody className="pb-6">
              {view === "list" && (
                <div className="space-y-4">
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {accounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="flex items-center justify-between p-3 rounded-[16px] bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] transition-colors"
                      >
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
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-sm text-[var(--foreground)]">
                            {formatMoney(acc.balance, acc.currency)}
                          </span>
                          <button
                            onClick={() => {
                              setEditingAccount(acc);
                              setEditName(acc.name);
                              setView("edit");
                            }}
                            className="p-2 text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-full transition-colors outline-none text-xs flex items-center justify-center"
                            type="button"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
                      isDisabled={accounts.length < 2}
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
                        onChange={(e) => setNewType(e.target.value as any)}
                        variant="secondary"
                      >
                        <option value="cash">{t("accounts.type.cash", { defaultValue: "Cash" })}</option>
                        <option value="card">{t("accounts.type.card", { defaultValue: "Card" })}</option>
                        <option value="crypto">{t("accounts.type.crypto", { defaultValue: "Crypto" })}</option>
                      </Select>
                    </label>

                    <label className="block text-xs font-semibold text-[var(--muted)]">
                      {t("accounts.fieldCurrency", { defaultValue: "Currency" })}
                      <Select
                        fullWidth
                        className="mt-1"
                        value={newCurrency}
                        onChange={(e) => setNewCurrency(e.target.value as CurrencyCode)}
                        variant="secondary"
                      >
                        {supportedCurrencies.map((curr) => (
                          <option key={curr} value={curr}>{curr}</option>
                        ))}
                      </Select>
                    </label>
                  </div>

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
                        {accounts.map((acc) => (
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
                        {accounts.map((acc) => (
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
                        placeholder="Automatic"
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
