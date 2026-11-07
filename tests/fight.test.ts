import { describe, expect, it } from "vitest";
import { runFight } from "@/lib/fight";
import type { FightEvent, Fighter, Llm } from "@/lib/types";

const fighters: Fighter[] = [
  { id: "f1", name: "Stay", option: "Stay in my job" },
  { id: "f2", name: "Leave", option: "Leave for a startup" },
];

const verdictJson = (winner: string) =>
  JSON.stringify({
    winner,
    recommendation: "Do it.",
    justification: "Because.",
    risks: ["r"],
    what_would_change_this: "x",
    next_step: "y",
    confidence: 0.7,
  });

/** Fake LLM: routes on prompt shape. `judge` receives the call index (0-based). */
function fakeLlm(opts: {
  judge: (call: number) => string;
  verdictWinner?: string;
}): Llm {
  let judgeCalls = 0;
  return {
    async text(prompt) {
      if (prompt.includes("You are the judge (Director) of a debate")) {
        return { text: opts.judge(judgeCalls++), tokens: 10 };
      }
      if (prompt.includes("is over.")) {
        return { text: verdictJson(opts.verdictWinner ?? "f1"), tokens: 20 };
      }
      return { text: "An argument.", tokens: 5 };
    },
  };
}

const judgeReply = (a: number, b: number) =>
  JSON.stringify({
    f1: { logic: a, evidence: a, honesty: a, reason: "r1" },
    f2: { logic: b, evidence: b, honesty: b, reason: "r2" },
  });

async function collect(llm: Llm, fs = fighters): Promise<FightEvent[]> {
  const out: FightEvent[] = [];
  for await (const e of runFight({ dilemma: "Should I switch jobs?", fighters: fs }, llm)) out.push(e);
  return out;
}

describe("runFight", () => {
  it("plays 5 rounds with the expected event order, then a verdict", async () => {
    const events = await collect(fakeLlm({ judge: () => judgeReply(5, 5) }));
    expect(events.slice(0, 4).map((e) => e.type)).toEqual(["round_start", "argument", "argument", "score"]);
    expect(events.filter((e) => e.type === "score")).toHaveLength(5);
    expect(events.at(-1)?.type).toBe("verdict");
  });

  it("ends early with a ko and verdict when HP hits 0", async () => {
    const events = await collect(fakeLlm({ judge: () => judgeReply(10, 0), verdictWinner: "f1" }));
    // 30 damage per round: 100 -> 70 -> 40 -> 10 -> 0 on round 4
    expect(events.filter((e) => e.type === "score")).toHaveLength(4);
    expect(events.find((e) => e.type === "ko")).toEqual({ type: "ko", fighterId: "f2" });
    expect(events.at(-1)?.type).toBe("verdict");
  });

  it("retries a malformed judge reply once", async () => {
    let n = 0;
    const events = await collect(
      fakeLlm({ judge: () => (n++ === 0 ? "garbage" : judgeReply(5, 5)) }),
    );
    expect(events.some((e) => e.type === "error")).toBe(false);
    expect(events.filter((e) => e.type === "score")).toHaveLength(5);
  });

  it("emits an error after the earlier events when the judge fails twice", async () => {
    const events = await collect(fakeLlm({ judge: () => "garbage" }));
    expect(events.at(-1)?.type).toBe("error");
    expect(events[0]).toEqual({ type: "round_start", round: 1 });
    expect(events.some((e) => e.type === "argument")).toBe(true);
  });

  it("emits an error when the LLM throws", async () => {
    const llm: Llm = {
      async text() {
        throw new Error("quota");
      },
    };
    const events = await collect(llm);
    expect(events.at(-1)).toEqual({ type: "error", message: "quota" });
  });

  it("forces the verdict winner to match the points winner", async () => {
    const events = await collect(fakeLlm({ judge: () => judgeReply(2, 9), verdictWinner: "f1" }));
    const v = events.at(-1);
    expect(v?.type === "verdict" && v.verdict.winner).toBe("f2");
  });

  it("always names a winner among the fighters, even with three equal fighters", async () => {
    const three: Fighter[] = [...fighters, { id: "f3", name: "Third", option: "Neither" }];
    const reply = JSON.stringify({
      f1: { logic: 1, evidence: 1, honesty: 1, reason: "" },
      f2: { logic: 1, evidence: 1, honesty: 1, reason: "" },
      f3: { logic: 1, evidence: 1, honesty: 1, reason: "" },
    });
    const events = await collect(fakeLlm({ judge: () => reply }), three);
    const v = events.at(-1);
    expect(v?.type === "verdict" && ["f1", "f2", "f3"].includes(v.verdict.winner)).toBe(true);
  });
});
