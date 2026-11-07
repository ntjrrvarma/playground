import { describe, expect, it } from "vitest";
import { applyDamage, computeDamage, pickWinner, standing, totalOf } from "@/lib/engine";

describe("totalOf", () => {
  it("sums the three criteria", () => {
    expect(totalOf({ logic: 8, evidence: 7, honesty: 9 })).toBe(24);
  });
});

describe("computeDamage", () => {
  it("two fighters: loser takes the gap", () => {
    expect(computeDamage({ a: 25, b: 20 })).toEqual({ a: 0, b: 5 });
  });
  it("three fighters: damage is gap to the best rival", () => {
    expect(computeDamage({ a: 25, b: 20, c: 10 })).toEqual({ a: 0, b: 5, c: 15 });
  });
  it("leader is damaged by the runner-up only if behind them", () => {
    expect(computeDamage({ a: 20, b: 25, c: 25 })).toEqual({ a: 5, b: 0, c: 0 });
  });
  it("equal totals deal no damage", () => {
    expect(computeDamage({ a: 18, b: 18 })).toEqual({ a: 0, b: 0 });
  });
});

describe("applyDamage", () => {
  it("subtracts damage and floors at 0", () => {
    expect(applyDamage({ a: 100, b: 3 }, { a: 5, b: 10 })).toEqual({ a: 95, b: 0 });
  });
});

describe("standing", () => {
  it("lists fighters with HP above 0", () => {
    expect(standing({ a: 10, b: 0, c: 1 })).toEqual(["a", "c"]);
  });
});

describe("pickWinner", () => {
  it("highest HP wins", () => {
    expect(pickWinner({ a: 40, b: 60 }, { a: 100, b: 10 })).toBe("b");
  });
  it("HP tie is broken by total score", () => {
    expect(pickWinner({ a: 50, b: 50 }, { a: 90, b: 95 })).toBe("b");
  });
  it("full tie goes to the first listed", () => {
    expect(pickWinner({ a: 50, b: 50 }, { a: 90, b: 90 })).toBe("a");
  });
  it("everyone knocked out: total score decides", () => {
    expect(pickWinner({ a: 0, b: 0, c: 0 }, { a: 60, b: 80, c: 70 })).toBe("b");
  });
});
