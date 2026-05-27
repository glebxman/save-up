import type { ExpenseCategory } from "@finance-twa/shared-types";

import type { MockHandler } from "./_types";

export const financeProcessVoice: MockHandler<"finance.processVoice"> = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const amounts = [500, 1200, 3500, 450];
  const categories: ExpenseCategory[] = ["taxi", "food", "shopping", "entertainment"];
  const randomIdx = Math.floor(Math.random() * amounts.length);

  return {
    type: "expense" as const,
    amount: amounts[randomIdx]!,
    category: categories[randomIdx]!,
    note: "MOCK: real AI requires npm run dev",
  };
};
