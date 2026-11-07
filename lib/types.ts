export type Fighter = { id: string; name: string; option: string };

export type Scores = { logic: number; evidence: number; honesty: number };

export type JudgedScores = Scores & { reason: string };

export type Verdict = {
  winner: string;
  recommendation: string;
  justification: string;
  risks: string[];
  what_would_change_this: string;
  next_step: string;
  confidence: number;
};

export interface Llm {
  text(prompt: string): Promise<{ text: string; tokens: number }>;
}

export type FightEvent =
  | { type: "round_start"; round: number }
  | { type: "argument"; fighterId: string; text: string; round: number }
  | {
      type: "score";
      round: number;
      scores: Record<string, JudgedScores>;
      damage: Record<string, number>;
      hp: Record<string, number>;
    }
  | { type: "ko"; fighterId: string }
  | {
      type: "verdict";
      verdict: Verdict;
      telemetry: Record<string, { tokens: number }>;
    }
  | { type: "error"; message: string };

