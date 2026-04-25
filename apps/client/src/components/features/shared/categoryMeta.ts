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

import type { ExpenseCategory } from "@/types/finance";

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
}

export const categoryMeta: Record<ExpenseCategory, CategoryMeta> = {
  food: { icon: FoodIcon, color: "text-orange-500", bg: "bg-orange-100", chartColor: "#fa791d" },
  taxi: { icon: TruckIcon, color: "text-yellow-500", bg: "bg-yellow-100", chartColor: "#ffcf00" },
  entertainment: { icon: SparklesIcon, color: "text-purple-500", bg: "bg-purple-100", chartColor: "#a551b2" },
  shopping: { icon: ShoppingBagIcon, color: "text-pink-500", bg: "bg-pink-100", chartColor: "#e92857" },
  utilities: { icon: BoltIcon, color: "text-blue-500", bg: "bg-blue-100", chartColor: "#6084ff" },
  health: { icon: HeartIcon, color: "text-red-500", bg: "bg-red-100", chartColor: "#e92554" },
  education: { icon: AcademicCapIcon, color: "text-teal-500", bg: "bg-teal-100", chartColor: "#3cad8b" },
  other: { icon: EllipsisHorizontalCircleIcon, color: "text-gray-500", bg: "bg-gray-100", chartColor: "#6b7280" },
};
