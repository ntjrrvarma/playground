import { applyDamage, computeDamage, MAX_HP, pickWinner, standing, totalOf } from "@/lib/engine";
import { parseJudge, parseVerdict } from "@/lib/llm";
import { fighterPrompt, judgePrompt, verdictPrompt } from "@/lib/prompts";
import type { FightEvent, Fighter, JudgedScores, Llm } from "@/lib/types";

export const ROUNDS = 5;

async function withRetry<T>(call: () => Promise<{ text: string; tokens: number }>, parse: (raw: string) => T, onTokens: (n: number) => void): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await call();
    onTokens(res.tokens);
    try {
      return parse(res.text);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Model reply could not be parsed");
}

export async function* runFight(
  input: { dilemma: string; fighters: Fighter[] },
  llm: Llm,
): AsyncGenerator<FightEvent> {
  const { dilemma, fighters } = input;
  const ids = fighters.map((f) => f.id);
  const tokens: Record<string, number> = Object.fromEntries([...ids, "judge"].map((k) => [k, 0]));
  let hp: Record<string, number> = Object.fromEntries(ids.map((id) => [id, MAX_HP]));
  const cumulative: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
  let previous: { fighterId: string; text: string }[] = [];
  const transcript: string[] = [];

  try {
    for (let round = 1; round <= ROUNDS; round++) {
      yield { type: "round_start", round };

      const texts = await Promise.all(
        fighters.map(async (fighter) => {
          const res = await llm.text(
            fighterPrompt({
              dilemma,
              fighter,
              rivals: fighters.filter((f) => f.id !== fighter.id),
              round,
              previous,
            }),
          );
          tokens[fighter.id] += res.tokens;
          return { fighterId: fighter.id, text: res.text.trim() };
        }),
      );
      for (const a of texts) yield { type: "argument", fighterId: a.fighterId, text: a.text, round };
      previous = texts;

      const scores: Record<string, JudgedScores> = await withRetry(
        () =>
          llm.text(
            judgePrompt({
              dilemma,
              round,
              arguments: texts.map((a) => ({ fighter: fighters.find((f) => f.id === a.fighterId)!, text: a.text })),
            }),
          ),
        (raw) => parseJudge(raw, ids),
        (n) => (tokens.judge += n),
      );

      const totals = Object.fromEntries(ids.map((id) => [id, totalOf(scores[id])]));
      for (const id of ids) cumulative[id] += totals[id];
      const damage = computeDamage(totals);
      const before = standing(hp);
      hp = applyDamage(hp, damage);
      yield { type: "score", round, scores, damage, hp };

      transcript.push(
        `Round ${round}:\n` +
          texts
            .map((a) => `${fighters.find((f) => f.id === a.fighterId)!.name}: ${a.text} (total ${totals[a.fighterId]}; ${scores[a.fighterId].reason})`)
            .join("\n"),
      );

      for (const id of before) if (hp[id] === 0) yield { type: "ko", fighterId: id };
      if (standing(hp).length <= 1) break;
    }

    const winnerId = pickWinner(hp, cumulative);
    const verdict = await withRetry(
      () =>
        llm.text(
          verdictPrompt({
            dilemma,
            winner: fighters.find((f) => f.id === winnerId)!,
            fighters,
            transcript: transcript.join("\n\n"),
          }),
        ),
      parseVerdict,
      (n) => (tokens.judge += n),
    );
    verdict.winner = winnerId;
    yield {
      type: "verdict",
      verdict,
      telemetry: Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, { tokens: v }])),
    };
  } catch (e) {
    yield { type: "error", message: e instanceof Error ? e.message : "Fight failed" };
  }
}

