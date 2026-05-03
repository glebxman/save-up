import {
  AcademicCapIcon,
  BoltIcon,
  EllipsisHorizontalCircleIcon,
  HeartIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TruckIcon,
} from "@heroicons/react/24/solid";
import { FoodIcon } from "../../layout/icons";
import type { ComponentType, SVGProps } from "react";

import type { CategoryCustomization, CustomCategory, ExpenseCategory } from "@/types/finance";
import type { TFunction } from "i18next";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "food",
  "taxi",
  "entertainment",
  "shopping",
  "utilities",
  "health",
  "education",
  "other",
];

export interface CategoryMeta {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
  chartColor: string;
  defaultEmoji: string;
}

export const categoryMeta: Record<ExpenseCategory, CategoryMeta> = {
  food: { icon: FoodIcon, color: "text-orange-500", bg: "bg-orange-100", chartColor: "#fa791d", defaultEmoji: "🍕" },
  taxi: { icon: TruckIcon, color: "text-yellow-500", bg: "bg-yellow-100", chartColor: "#ffcf00", defaultEmoji: "🚕" },
  entertainment: { icon: SparklesIcon, color: "text-purple-500", bg: "bg-purple-100", chartColor: "#a551b2", defaultEmoji: "🎮" },
  shopping: { icon: ShoppingBagIcon, color: "text-pink-500", bg: "bg-pink-100", chartColor: "#e92857", defaultEmoji: "🛍️" },
  utilities: { icon: BoltIcon, color: "text-blue-500", bg: "bg-blue-100", chartColor: "#6084ff", defaultEmoji: "⚡" },
  health: { icon: HeartIcon, color: "text-red-500", bg: "bg-red-100", chartColor: "#e92554", defaultEmoji: "❤️" },
  education: { icon: AcademicCapIcon, color: "text-teal-500", bg: "bg-teal-100", chartColor: "#3cad8b", defaultEmoji: "🎓" },
  other: { icon: EllipsisHorizontalCircleIcon, color: "text-gray-500", bg: "bg-gray-100", chartColor: "#6b7280", defaultEmoji: "📦" },
};

const CUSTOM_CHART_COLORS = [
  "#f97316", "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#8b5cf6", "#ec4899", "#3b82f6", "#64748b",
];

function getCustomChartColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (id.charCodeAt(i) + ((hash << 5) - hash)) | 0;
  }
  return CUSTOM_CHART_COLORS[Math.abs(hash) % CUSTOM_CHART_COLORS.length] ?? "#6b7280";
}

export function isBuiltinCategory(key: string): key is ExpenseCategory {
  return Object.prototype.hasOwnProperty.call(categoryMeta, key);
}

export interface CategoryDisplay {
  name: string;
  emoji?: string;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  color: string;
  bg: string;
  chartColor: string;
}

export function getCategoryDisplay(
  categoryKey: string,
  options: {
    customCategories?: CustomCategory[];
    customizations?: Partial<Record<ExpenseCategory, CategoryCustomization>>;
    t?: TFunction;
  } = {},
): CategoryDisplay {
  const { customCategories = [], customizations = {}, t } = options;

  if (isBuiltinCategory(categoryKey)) {
    const meta = categoryMeta[categoryKey];
    const customization = customizations[categoryKey];
    return {
      name: customization?.name ?? (t ? t(`expenseCategory.${categoryKey}`) : categoryKey),
      emoji: customization?.emoji ?? meta.defaultEmoji,
      Icon: meta.icon,
      color: meta.color,
      bg: meta.bg,
      chartColor: meta.chartColor,
    };
  }

  const custom = customCategories.find((c) => c.id === categoryKey);
  if (custom) {
    return {
      name: custom.name,
      emoji: custom.emoji,
      color: "text-[var(--foreground)]",
      bg: "bg-[var(--surface-secondary)]",
      chartColor: getCustomChartColor(categoryKey),
    };
  }

  return {
    name: categoryKey,
    color: "text-[var(--muted)]",
    bg: "bg-[var(--surface-secondary)]",
    chartColor: "#9ca3af",
  };
}
