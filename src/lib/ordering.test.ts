import { describe, it, expect } from "vitest";
import {
  positionBetween,
  needsRebalance,
  rebalance,
  positionForMove,
  STEP,
} from "./ordering";

describe("positionBetween", () => {
  it("seeds the first item in an empty column", () => {
    expect(positionBetween(null, null)).toBe(STEP);
  });

  it("appends one step past the last item", () => {
    expect(positionBetween(1024, null)).toBe(2048);
  });

  it("prepends at half the first item's position", () => {
    expect(positionBetween(null, 1024)).toBe(512);
  });

  it("returns the midpoint between two neighbors", () => {
    expect(positionBetween(1024, 2048)).toBe(1536);
    expect(positionBetween(1000, 1001)).toBe(1000.5);
  });

  it("throws when before is not strictly less than after", () => {
    expect(() => positionBetween(2048, 1024)).toThrow();
    expect(() => positionBetween(1024, 1024)).toThrow();
  });
});

describe("needsRebalance", () => {
  it("is false for well-spaced neighbors", () => {
    expect(needsRebalance(1024, 2048)).toBe(false);
  });

  it("is true when neighbors are closer than the minimum gap", () => {
    expect(needsRebalance(1.0, 1.0000004)).toBe(true);
  });

  it("is false at an open end", () => {
    expect(needsRebalance(null, 5)).toBe(false);
    expect(needsRebalance(5, null)).toBe(false);
  });
});

describe("rebalance", () => {
  it("evenly re-spaces positions preserving order", () => {
    expect(rebalance([1, 2, 3])).toEqual([1024, 2048, 3072]);
  });

  it("handles an empty list", () => {
    expect(rebalance([])).toEqual([]);
  });
});

describe("positionForMove", () => {
  it("moves a card to the front", () => {
    expect(positionForMove([1024, 2048, 3072], 0)).toEqual({
      position: 512,
      rebalance: false,
    });
  });

  it("moves a card between two others", () => {
    expect(positionForMove([1024, 2048, 3072], 1)).toEqual({
      position: 1536,
      rebalance: false,
    });
  });

  it("moves a card to the end", () => {
    expect(positionForMove([1024, 2048, 3072], 3)).toEqual({
      position: 4096,
      rebalance: false,
    });
  });

  it("places the first card in an empty column", () => {
    expect(positionForMove([], 0)).toEqual({ position: 1024, rebalance: false });
  });
});
