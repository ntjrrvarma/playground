import { describe, expect, it } from "vitest";
import { initialArenaState, reduceArena } from "@/lib/arenaState";
import type { Fighter } from "@/lib/types";

const fighters: Fighter[] = [
  { id: "f1", name: "Option A", option: "Option A" },
  { id: "f2", name: "Option B", option: "Option B" },
];

describe("reduceArena", () => {
  it("initializes fighters with 100 HP and idle animation", () => {
    const s = initialArenaState(fighters);
    expect(s.hp).toEqual({ f1: 100, f2: 100 });
    expect(s.anim).toEqual({ f1: "idle", f2: "idle" });
    expect(s.round).toBe(0);
  });

  it("score event sets leader to attack and damaged fighter to hit", () => {
    let s = initialArenaState(fighters);
    s = reduceArena(s, { type: "round_start", round: 1 });
    s = reduceArena(s, {
      type: "score",
      round: 1,
      scores: {
        f1: { logic: 9, evidence: 8, honesty: 8, reason: "solid" },
        f2: { logic: 6, evidence: 6, honesty: 6, reason: "weak" },
      },
      damage: { f1: 0, f2: 7 },
      hp: { f1: 100, f2: 93 },
    });
    expect(s.anim.f1).toBe("attack");
    expect(s.anim.f2).toBe("hit");
    expect(s.hp.f2).toBe(93);
  });

  it("ko event sets fighter animation to ko and round_start preserves ko while resetting others to idle", () => {
    let s = initialArenaState(fighters);
    s = reduceArena(s, { type: "ko", fighterId: "f2" });
    expect(s.anim.f2).toBe("ko");

    s = reduceArena(s, { type: "round_start", round: 2 });
    expect(s.round).toBe(2);
    expect(s.anim.f1).toBe("idle");
    expect(s.anim.f2).toBe("ko");
  });
});
