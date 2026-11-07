import { describe, expect, it } from "vitest";
import { parseJudge, parseVerdict } from "@/lib/llm";

const ids = ["f1", "f2"];
const judgeJson = {
  f1: { logic: 8, evidence: 7, honesty: 9, reason: "quoted point" },
  f2: { logic: 5, evidence: 6, honesty: 7, reason: "weak claim" },
};

describe("parseJudge", () => {
  it("parses valid JSON", () => {
    const r = parseJudge(JSON.stringify(judgeJson), ids);
    expect(r.f1).toEqual({ logic: 8, evidence: 7, honesty: 9, reason: "quoted point" });
  });
  it("strips code fences", () => {
    const r = parseJudge("```json\n" + JSON.stringify(judgeJson) + "\n```", ids);
    expect(r.f2.logic).toBe(5);
  });
  it("clamps scores to 0-10", () => {
    const r = parseJudge(JSON.stringify({ ...judgeJson, f1: { ...judgeJson.f1, logic: 14, honesty: -3 } }), ids);
    expect(r.f1.logic).toBe(10);
    expect(r.f1.honesty).toBe(0);
  });
  it("throws when a fighter is missing", () => {
    expect(() => parseJudge(JSON.stringify({ f1: judgeJson.f1 }), ids)).toThrow();
  });
  it("throws on non-JSON", () => {
    expect(() => parseJudge("not json", ids)).toThrow();
  });
});

describe("parseVerdict", () => {
  const verdict = {
    winner: "f1",
    recommendation: "Take the job.",
    justification: "Stronger long-term case.",
    risks: ["Relocation"],
    what_would_change_this: "A pay cut.",
    next_step: "Call the recruiter.",
    confidence: 0.8,
  };
  it("parses a complete verdict", () => {
    expect(parseVerdict(JSON.stringify(verdict)).recommendation).toBe("Take the job.");
  });
  it("rejects a missing recommendation", () => {
    const { recommendation: _r, ...rest } = verdict;
    expect(() => parseVerdict(JSON.stringify(rest))).toThrow();
  });
});

