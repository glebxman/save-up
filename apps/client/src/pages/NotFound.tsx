import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Chip } from "@heroui/react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

export function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Card className="mx-auto mt-10 max-w-md" variant="secondary">
      <CardHeader>
        <div className="flex w-full items-start justify-between gap-3">
          <div>
            <CardDescription>{t("notFound.caption")}</CardDescription>
            <CardTitle>{t("notFound.title")}</CardTitle>
          </div>

          <Chip color="warning" variant="soft">
            404
          </Chip>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          <p className="m-0 text-sm text-[var(--muted)]">{t("notFound.description")}</p>
          <Button fullWidth onPress={() => navigate("/")} variant="primary">
            {t("notFound.action")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
