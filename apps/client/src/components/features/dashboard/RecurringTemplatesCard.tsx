import { Button, Card, CardContent } from "@heroui/react";
import { useTranslation } from "react-i18next";

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
    <Card variant="default">
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <p className="m-0 text-sm font-semibold text-[var(--foreground)]">{t("recurring.title")}</p>
          <Button onPress={onAdd} size="sm" variant="secondary">
            {t("recurring.add")}
          </Button>
        </div>

        {templates.length === 0 ? (
          <p className="m-0 text-sm text-[var(--muted)]">{t("recurring.empty")}</p>
        ) : (
          <div className="divide-y divide-[var(--separator)]">
            {templates.map((template) => {
              const isBusy = busyTemplateId === template.id;

              return (
                <div key={template.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="m-0 truncate text-sm font-medium text-[var(--foreground)]">{template.title}</p>
                    <p className="m-0 mt-0.5 text-xs text-[var(--muted)]">
                      {t(`transactionType.${template.type}`)} &middot; {formatMoney(template.amount)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
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
