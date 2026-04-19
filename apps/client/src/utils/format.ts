import i18n from "@/i18n";

const localeMap = {
  en: "en-US",
  ru: "ru-RU",
  uz: "uz-UZ",
} as const;

export function formatMoney(value: number): string {
  const language = (i18n.resolvedLanguage ?? "en").slice(0, 2) as keyof typeof localeMap;
  const locale = localeMap[language] ?? localeMap.en;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
