import { MAX_HP } from "@/lib/engine";
import type { FightEvent, Fighter, JudgedScores, Verdict } from "@/lib/types";

export type FighterAnim = "idle" | "attack" | "hit" | "ko";

export type RoundRecord = {
  round: number;
  arguments: Record<string, string>;
  scores?: Record<string, JudgedScores>;
  damage?: Record<string, number>;
  hp?: Record<string, number>;
};

export type ArenaState = {
  round: number;
  hp: Record<string, number>;
  anim: Record<string, FighterAnim>;
  lastDamage: Record<string, number>;
  rounds: RoundRecord[];
  verdict?: Verdict;
  telemetry?: Record<string, { tokens: number }>;
  error?: string;
  eventSeq: number;
};

export function initialArenaState(fighters: Fighter[]): ArenaState {
  const hp: Record<string, number> = {};
  const anim: Record<string, FighterAnim> = {};
  const lastDamage: Record<string, number> = {};
  for (const f of fighters) {
    hp[f.id] = MAX_HP;
    anim[f.id] = "idle";
    lastDamage[f.id] = 0;
  }
  return {
    round: 0,
    hp,
    anim,
    lastDamage,
    rounds: [],
    eventSeq: 0,
  };
}

export function reduceArena(state: ArenaState, e: FightEvent): ArenaState {
  const seq = state.eventSeq + 1;

  if (e.type === "round_start") {
    const nextAnim: Record<string, FighterAnim> = {};
    for (const [id, cur] of Object.entries(state.anim)) {
      nextAnim[id] = cur === "ko" ? "ko" : "idle";
    }
    const existing = state.rounds.find((r) => r.round === e.round);
    const rounds = existing
      ? state.rounds
      : [...state.rounds, { round: e.round, arguments: {} }];
    return { ...state, round: e.round, anim: nextAnim, rounds, eventSeq: seq };
  }

  if (e.type === "argument") {
    const rounds = state.rounds.map((r) =>
      r.round === e.round
        ? { ...r, arguments: { ...r.arguments, [e.fighterId]: e.text } }
        : r,
    );
    return { ...state, rounds, eventSeq: seq };
  }

  if (e.type === "score") {
    const nextAnim: Record<string, FighterAnim> = { ...state.anim };
    for (const id of Object.keys(e.hp)) {
      if (state.anim[id] === "ko") {
        nextAnim[id] = "ko";
      } else if ((e.damage[id] ?? 0) > 0) {
        nextAnim[id] = "hit";
      } else {
        nextAnim[id] = "attack";
      }
    }
    const rounds = state.rounds.map((r) =>
      r.round === e.round
        ? { ...r, scores: e.scores, damage: e.damage, hp: e.hp }
        : r,
    );
    return {
      ...state,
      hp: e.hp,
      lastDamage: e.damage,
      anim: nextAnim,
      rounds,
      eventSeq: seq,
    };
  }

  if (e.type === "ko") {
    return {
      ...state,
      anim: { ...state.anim, [e.fighterId]: "ko" },
      eventSeq: seq,
    };
  }

  if (e.type === "verdict") {
    return {
      ...state,
      verdict: e.verdict,
      telemetry: e.telemetry,
      eventSeq: seq,
    };
  }

  if (e.type === "error") {
    return {
      ...state,
      error: e.message,
      eventSeq: seq,
    };
  }

  return state;
}
