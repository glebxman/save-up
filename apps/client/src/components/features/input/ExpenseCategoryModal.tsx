import {
  AcademicCapIcon,
  BoltIcon,
  EllipsisHorizontalCircleIcon,
  HeartIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TruckIcon,
} from "@heroicons/react/24/solid";
import { Button, Chip, Modal } from "@heroui/react";
import type { ComponentType, SVGProps } from "react";
import { useTranslation } from "react-i18next";

import type { ExpenseCategory } from "@/types/finance";

interface ExpenseCategoryModalProps {
  isOpen: boolean;
  isPending?: boolean;
  onClose: () => void;
  onSelect: (category: ExpenseCategory) => void;
  selectedCategory?: ExpenseCategory | null;
  title?: string;
  question?: string;
}

// Using a simple fork/knife SVG since heroicons doesn't have a food icon
function FoodIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z" />
    </svg>
  );
}

const categories: { key: ExpenseCategory; icon: ComponentType<SVGProps<SVGSVGElement>>; color: string }[] = [
  { key: "food", icon: FoodIcon, color: "text-orange-500" },
  { key: "taxi", icon: TruckIcon, color: "text-yellow-500" },
  { key: "entertainment", icon: SparklesIcon, color: "text-purple-500" },
  { key: "shopping", icon: ShoppingBagIcon, color: "text-pink-500" },
  { key: "utilities", icon: BoltIcon, color: "text-blue-500" },
  { key: "health", icon: HeartIcon, color: "text-red-500" },
  { key: "education", icon: AcademicCapIcon, color: "text-teal-500" },
  { key: "other", icon: EllipsisHorizontalCircleIcon, color: "text-gray-500" },
];

export function ExpenseCategoryModal({
  isOpen,
  isPending,
  onClose,
  onSelect,
  selectedCategory,
  title,
  question,
}: ExpenseCategoryModalProps) {
  const { t } = useTranslation();

  return (
    <Modal>
      <Modal.Backdrop isOpen={isOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()} variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog>
            <Modal.CloseTrigger />

            <Modal.Header>
              <div className="flex flex-col gap-2">
                <Chip color="accent" variant="primary">
                  {title ?? t("expenseCategory.title")}
                </Chip>
                <Modal.Heading>{question ?? t("expenseCategory.question")}</Modal.Heading>
              </div>
            </Modal.Header>

            <Modal.Body>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(({ key, icon: Icon, color }) => (
                  <Button
                    key={key}
                    className="h-auto min-h-[92px] flex-col gap-2 px-2 py-3 text-center"
                    isDisabled={isPending}
                    onPress={() => onSelect(key)}
                    variant={selectedCategory === key ? "primary" : "secondary"}
                  >
                    <Icon className={`h-6 w-6 ${selectedCategory === key ? "text-current" : color}`} />
                    <span className="text-[10px] leading-tight">
                      {t(`expenseCategory.${key}`)}
                    </span>
                  </Button>
                ))}
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
