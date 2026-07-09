import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Button,
  Input,
  Modal,
  ModalBackdrop,
  ModalBody,
  ModalCloseTrigger,
  ModalContainer,
  ModalDialog,
  ModalHeader,
  ModalHeading,
} from "@/components/ui";
import { EXPENSE_CATEGORIES, getCategoryDisplay } from "@/components/features/shared/categoryMeta";
import { parseAmount } from "@/utils/format";
import type { CategoryCustomization, CustomCategory, ExpenseCategory } from "@/types/finance";

interface CategoryLimitsModalProps {
  isOpen: boolean;
  isPending?: boolean;
  initialLimits: Record<string, number>;
  customCategories?: CustomCategory[];
  customizations?: Partial<Record<ExpenseCategory, CategoryCustomization>>;
  onClose: () => void;
  onSubmit: (limits: Record<string, number>) => void;
}

export function CategoryLimitsModal({
  isOpen,
  isPending,
  initialLimits,
  customCategories = [],
  customizations = {},
  onClose,
  onSubmit,
}: CategoryLimitsModalProps) {
  const { t } = useTranslation();
  const allKeys = useMemo(
    () => [...EXPENSE_CATEGORIES, ...customCategories.map((c) => c.id)],
    [customCategories],
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    const next: Record<string, string> = {};
    for (const key of allKeys) {
      const value = initialLimits[key];
      next[key] = value && value > 0 ? String(value) : "";
    }
    setDrafts(next);
  }, [isOpen, allKeys, initialLimits]);

  const handleSubmit = () => {
    const result: Record<string, number> = {};
    for (const [key, raw] of Object.entries(drafts)) {
      const value = parseAmount(raw);
      if (value > 0) result[key] = value;
    }
    onSubmit(result);
  };

  return (
    <Modal>
      <ModalBackdrop isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
        <ModalContainer size="md">
          <ModalDialog>
            <ModalCloseTrigger />
            <ModalHeader>
              <div className="flex flex-col gap-2">
                <ModalHeading>{t("limits.title")}</ModalHeading>
                <p className="m-0 text-sm text-[var(--muted)]">{t("limits.question")}</p>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="grid gap-3">
                <div className="grid max-h-[50vh] gap-2 overflow-y-auto pr-1">
                  {allKeys.map((key) => {
                    const display = getCategoryDisplay(key, { customCategories, customizations, t });
                    return (
                      <label key={key} className="flex items-center gap-3 rounded-[18px] bg-[var(--surface-secondary)] px-3 py-2">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-base">
                          {display.emoji ?? "•"}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--foreground)]">{display.name}</span>
                        <Input
                          aria-label={display.name}
                          className="w-32 text-right"
                          inputMode="decimal"
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder={t("limits.placeholder")}
                          value={drafts[key] ?? ""}
                        />
                      </label>
                    );
                  })}
                </div>
                <p className="m-0 text-xs text-[var(--muted)]">{t("limits.helperText")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button className="w-full" isDisabled={isPending} onPress={onClose} variant="secondary">
                    {t("common.cancel")}
                  </Button>
                  <Button className="w-full" isDisabled={isPending} onPress={handleSubmit} variant="primary">
                    {t("limits.save")}
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
