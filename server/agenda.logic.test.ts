import { describe, expect, it } from "vitest";
import { calculateEndAt, rangesOverlap } from "./agenda.logic";

describe("agenda logic", () => {
  it("calculates the end timestamp from service duration", () => {
    expect(calculateEndAt(1_700_000_000_000, 90)).toBe(1_700_005_400_000);
  });

  it("detects overlapping intervals but allows adjacent appointments", () => {
    expect(rangesOverlap(10, 20, 19, 30)).toBe(true);
    expect(rangesOverlap(10, 20, 20, 30)).toBe(false);
    expect(rangesOverlap(30, 40, 10, 30)).toBe(false);
  });

  it("rejects invalid timestamps and durations", () => {
    expect(() => calculateEndAt(0, 30)).toThrow();
    expect(() => calculateEndAt(1_700_000_000_000, 0)).toThrow();
  });
});
