import type { Scores } from "@/lib/types";

export const MAX_HP = 100;

export function validateFightInput(body: unknown): {
  ok: true;
  dilemma: string;
  options: string[];
} | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request payload." };
  }
  const rawDilemma = (body as { dilemma?: unknown }).dilemma;
  const rawOptions = (body as { options?: unknown }).options;
  const dilemma = typeof rawDilemma === "string" ? rawDilemma.trim() : "";
  if (!dilemma) {
    return { ok: false, error: "Enter a dilemma before starting the fight." };
  }
  if (!Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > 4) {
    return { ok: false, error: "Provide between 2 and 4 options." };
  }
  const options = rawOptions.map((o) => (typeof o === "string" ? o.trim() : ""));
  if (options.some((o) => !o)) {
    return { ok: false, error: "Every option must have non-empty text." };
  }
  const seen = new Set<string>();
  for (const o of options) {
    const key = o.toLowerCase();
    if (seen.has(key)) {
      return { ok: false, error: "Options must be distinct." };
    }
    seen.add(key);
  }
  return { ok: true, dilemma, options };
}

export function totalOf(s: Scores): number {
  return s.logic + s.evidence + s.honesty;
}

/** Damage to each fighter = gap to the best *other* fighter's round total, never below 0. */
export function computeDamage(totals: Record<string, number>): Record<string, number> {
  const ids = Object.keys(totals);
  const damage: Record<string, number> = {};
  for (const id of ids) {
    const bestOther = Math.max(...ids.filter((o) => o !== id).map((o) => totals[o]));
    damage[id] = Math.max(0, bestOther - totals[id]);
  }
  return damage;
}

export function applyDamage(
  hp: Record<string, number>,
  dmg: Record<string, number>,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const id of Object.keys(hp)) next[id] = Math.max(0, hp[id] - (dmg[id] ?? 0));
  return next;
}

export function standing(hp: Record<string, number>): string[] {
  return Object.keys(hp).filter((id) => hp[id] > 0);
}

/** Highest HP wins; ties go to highest cumulative score, then to the first listed. */
export function pickWinner(
  hp: Record<string, number>,
  totalScores: Record<string, number>,
): string {
  return Object.keys(hp).reduce((best, id) =>
    hp[id] > hp[best] || (hp[id] === hp[best] && (totalScores[id] ?? 0) > (totalScores[best] ?? 0))
      ? id
      : best,
  );
}

