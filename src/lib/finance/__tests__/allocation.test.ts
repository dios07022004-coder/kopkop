import { describe, expect, it } from "vitest";
import { allocateCategories } from "../allocation";
import { DEFAULT_CATEGORIES } from "../constants";

describe("allocateCategories", () => {
  it("sums to availableForLife", () => {
    const result = allocateCategories(45000, DEFAULT_CATEGORIES);
    expect(result.totalAllocated).toBe(45000);
  });

  it("puts rounding remainder in Прочее category", () => {
    const result = allocateCategories(10001, DEFAULT_CATEGORIES);
    expect(result.totalAllocated).toBe(10001);
    const other = result.allocations.find((a) => a.id === "other");
    expect(other).toBeDefined();
  });

  it("returns empty for zero life budget", () => {
    const result = allocateCategories(0, DEFAULT_CATEGORIES);
    expect(result.allocations).toHaveLength(0);
  });

  it("normalizes when percents sum to 90", () => {
    const cats = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      percent: c.percent * 0.9,
    }));
    const result = allocateCategories(9000, cats);
    expect(result.totalAllocated).toBe(9000);
  });
});
