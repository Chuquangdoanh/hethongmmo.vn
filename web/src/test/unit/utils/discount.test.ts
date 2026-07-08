import { describe, it, expect } from "vitest";
import { getDiscountInfo, getResourceDiscountInfo, applyDiscount } from "@/lib/utils/discount";

describe("getDiscountInfo", () => {
  it("returns 0% when no tier reached and no override", () => {
    expect(getDiscountInfo(0, 0)).toEqual({ pct: 0, label: "Thường", isOverride: false });
  });

  it("returns tier pct based on totalDeposited thresholds", () => {
    expect(getDiscountInfo(15_000_000, 0).pct).toBe(5);
    expect(getDiscountInfo(50_000_000, 0).pct).toBe(10);
    expect(getDiscountInfo(100_000_000, 0).pct).toBe(15);
  });

  it("admin override always wins over tier", () => {
    const info = getDiscountInfo(100_000_000, 7);
    expect(info).toEqual({ pct: 7, label: "Admin", isOverride: true });
  });
});

describe("getResourceDiscountInfo", () => {
  it("uses agentDiscountPercent (Đại lý) when > 0, ignoring tier and override", () => {
    const info = getResourceDiscountInfo(0, 0, 10);
    expect(info).toEqual({ pct: 10, label: "Đại lý", isOverride: true });
  });

  it("agent discount wins even when tier/override would give a lower value", () => {
    const info = getResourceDiscountInfo(0, 5, 15);
    expect(info.pct).toBe(15);
    expect(info.label).toBe("Đại lý");
  });

  it("falls back to tier/override logic when agentDiscountPercent is 0", () => {
    expect(getResourceDiscountInfo(50_000_000, 0, 0).pct).toBe(10);
    expect(getResourceDiscountInfo(0, 8, 0)).toEqual({ pct: 8, label: "Admin", isOverride: true });
  });

  it("returns 0% when nothing applies", () => {
    expect(getResourceDiscountInfo(0, 0, 0).pct).toBe(0);
  });
});

describe("applyDiscount", () => {
  it("returns catalog price unchanged when pct <= 0", () => {
    expect(applyDiscount(100_000, 0)).toBe(100_000);
  });

  it("rounds discounted price to nearest VND", () => {
    expect(applyDiscount(100_000, 15)).toBe(85_000);
    expect(applyDiscount(99_999, 10)).toBe(89_999);
  });
});
