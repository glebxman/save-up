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

export function formatDate(value: string): string {
  const language = (i18n.resolvedLanguage ?? "en").slice(0, 2) as keyof typeof localeMap;
  const locale = localeMap[language] ?? localeMap.en;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  const language = (i18n.resolvedLanguage ?? "en").slice(0, 2) as keyof typeof localeMap;
  const locale = localeMap[language] ?? localeMap.en;

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toDateInputValue(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}
