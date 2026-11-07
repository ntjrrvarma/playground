import type { Scores } from "@/lib/types";

export const MAX_HP = 100;

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

