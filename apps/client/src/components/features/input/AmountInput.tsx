import { Button, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, Input } from "@heroui/react";
import { useTranslation } from "react-i18next";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
}

const quickAmounts = [1000, 5000, 10000];

export function AmountInput({ value, onChange }: AmountInputProps) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden" variant="default">
      <CardHeader>
        <div>
          <CardDescription>{t("amountInput.caption")}</CardDescription>
          <CardTitle>{t("amountInput.title")}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <Input
          fullWidth
          min="0"
          onChange={(event) => onChange(event.target.value)}
          placeholder="0.00"
          step="0.01"
          type="number"
          value={value}
          variant="secondary"
        />
      </CardContent>

      <CardFooter>
        <div className="grid w-full grid-cols-3 gap-2">
          {quickAmounts.map((amount) => (
            <Button key={amount} className="rounded-full" onPress={() => onChange(String(amount))} variant="secondary">
              +{amount}
            </Button>
          ))}
        </div>
      </CardFooter>
    </Card>
  );
}
