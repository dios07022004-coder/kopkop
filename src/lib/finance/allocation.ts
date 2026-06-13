import { REMAINDER_CATEGORY_ID } from "./constants";
import type { AllocationResult, BudgetCategory } from "./types";

export function allocateCategories(
  availableForLife: number,
  categories: BudgetCategory[],
): AllocationResult {
  if (availableForLife <= 0 || categories.length === 0) {
    return { allocations: [], totalAllocated: 0 };
  }

  const totalPercent = categories.reduce((s, c) => s + c.percent, 0);
  const normalizer = totalPercent > 0 ? totalPercent : 100;

  const allocations = categories.map((cat) => ({
    id: cat.id,
    label: cat.label,
    percent: cat.percent,
    amount: Math.round((availableForLife * cat.percent) / normalizer),
  }));

  const allocatedSum = allocations.reduce((s, a) => s + a.amount, 0);
  const diff = availableForLife - allocatedSum;

  if (diff !== 0) {
    const remainderIdx = allocations.findIndex(
      (a) => a.id === REMAINDER_CATEGORY_ID,
    );
    const targetIdx =
      remainderIdx >= 0
        ? remainderIdx
        : allocations.reduce(
            (best, a, i, arr) => (a.amount > arr[best].amount ? i : best),
            0,
          );
    allocations[targetIdx].amount += diff;
  }

  return {
    allocations,
    totalAllocated: allocations.reduce((s, a) => s + a.amount, 0),
  };
}
