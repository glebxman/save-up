import { Card, CardContent, CardDescription, CardHeader, CardTitle, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";

import { formatMoney } from "@/utils/format";

interface SavingsCardProps {
  savings: number;
  savingsPct: number;
}

export function SavingsCard({ savings, savingsPct }: SavingsCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="h-full overflow-hidden" variant="default">
      <CardHeader>
        <div className="flex w-full items-start justify-between gap-3">
          <div>
            <CardDescription>{t("savings.caption")}</CardDescription>
            <CardTitle>{formatMoney(savings)}</CardTitle>
          </div>

          <Chip color="accent" variant="primary">
            {savingsPct}%
          </Chip>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-[22px] bg-black/5 p-3">
          <p className="m-0 text-sm text-[var(--muted)]">{t("savings.description")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
