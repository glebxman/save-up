import { useTranslation } from "react-i18next";

import { EmptyIcon } from "@/components/layout/icons";
import { Button, Card, CardContent } from "@/components/ui";
import type { RecurringTransaction } from "@/types/finance";
import { formatMoney } from "@/utils/format";

interface RecurringTemplatesCardProps {
  templates: RecurringTransaction[];
  busyTemplateId?: string | null;
  onAdd: () => void;
  onEdit: (template: RecurringTransaction) => void;
  onApply: (template: RecurringTransaction) => void;
  onDelete: (template: RecurringTransaction) => void;
}

export function RecurringTemplatesCard({
  templates,
  busyTemplateId,
  onAdd,
  onEdit,
  onApply,
  onDelete,
}: RecurringTemplatesCardProps) {
  const { t } = useTranslation();

  return (
    <Card data-onboarding="templates" variant="default">
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="m-0 text-sm text-[var(--muted)]">{t("recurring.caption")}</p>
            <p className="m-0 mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">{t("recurring.title")}</p>
          </div>
          <Button onPress={onAdd} size="sm" variant="secondary">
            {t("recurring.add")}
          </Button>
        </div>

        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--muted)]">
              <EmptyIcon className="h-6 w-6" />
            </span>
            <p className="m-0 text-sm text-[var(--muted)]">{t("recurring.empty")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {templates.map((template) => {
              const isBusy = busyTemplateId === template.id;

              return (
                <div key={template.id} className="rounded-[24px] bg-[var(--surface-secondary)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-medium text-[var(--foreground)]">{template.title}</p>
                      <p className="m-0 mt-1 text-xs text-[var(--muted)]">
                        {t(`transactionType.${template.type}`)} &middot; {formatMoney(template.amount)}
                        {template.autoApply && template.dayOfMonth
                          ? <> &middot; <span className="text-[var(--accent-text)]">⚡ {template.dayOfMonth}</span></>
                          : null}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex shrink-0 items-center gap-1.5">
                    <Button isDisabled={isBusy} onPress={() => onEdit(template)} size="sm" variant="secondary">
                      {t("recurring.edit")}
                    </Button>
                    <Button isDisabled={isBusy} onPress={() => onDelete(template)} size="sm" variant="danger-soft">
                      {t("recurring.delete")}
                    </Button>
                    <Button isDisabled={isBusy} onPress={() => onApply(template)} size="sm" variant="primary">
                      {t("recurring.run")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
