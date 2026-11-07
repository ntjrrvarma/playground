import { describe, expect, it } from "vitest";
import { runFight } from "@/lib/fight";
import type { FightEvent, Fighter, Llm } from "@/lib/types";

describe("3-fighter end-to-end smoke test", () => {
  it("runs a 3-fighter dilemma through 5 rounds and produces a valid winner", async () => {
    const fighters: Fighter[] = [
      { id: "f1", name: "Startup", option: "Join the AI startup" },
      { id: "f2", name: "Enterprise", option: "Take the Staff Enterprise role" },
      { id: "f3", name: "Consult", option: "Bootstrap an independent consultancy" },
    ];

    const llm: Llm = {
      async text(prompt) {
        if (prompt.includes("You are the judge (Director) of a debate")) {
          return {
            text: JSON.stringify({
              f1: { logic: 8, evidence: 8, honesty: 8, reason: "Clear milestones" },
              f2: { logic: 7, evidence: 8, honesty: 7, reason: "Lower risk" },
              f3: { logic: 6, evidence: 5, honesty: 7, reason: "Uncertain pipeline" },
            }),
            tokens: 120,
          };
        }
        if (prompt.includes("is over.")) {
          return {
            text: JSON.stringify({
              winner: "f1",
              recommendation: "Join the AI startup with an explicit 12-month milestone review.",
              justification: "Highest compounding learning and equity upside.",
              risks: ["Runway risk"],
              what_would_change_this: "If base compensation requirements increase.",
              next_step: "Review the cap table and sign.",
              confidence: 0.82,
            }),
            tokens: 150,
          };
        }
        return { text: "Focused argument.", tokens: 60 };
      },
    };

    const events: FightEvent[] = [];
    for await (const ev of runFight({ dilemma: "Which career path next?", fighters }, llm)) {
      events.push(ev);
    }

    const last = events.at(-1);
    expect(last?.type).toBe("verdict");
    if (last?.type === "verdict") {
      expect(["f1", "f2", "f3"]).toContain(last.verdict.winner);
      expect(last.verdict.winner).toBe("f1");
      expect(last.telemetry.judge.tokens).toBeGreaterThan(0);
    }
  });
});
