import type { RoundRecord } from "@/lib/arenaState";
import { totalOf } from "@/lib/engine";
import type { Fighter } from "@/lib/types";

export function SpeechPanel({
  fighters,
  rounds,
  hp,
}: {
  fighters: Fighter[];
  rounds: RoundRecord[];
  hp: Record<string, number>;
}) {
  const latest = rounds.at(-1);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
        {fighters.map((f, idx) => {
          const arg = latest?.arguments[f.id];
          const score = latest?.scores?.[f.id];
          const dmg = latest?.damage?.[f.id] ?? 0;
          const curHp = hp[f.id] ?? 100;

          return (
            <div key={f.id} className="flex flex-col justify-between bg-[var(--surface)] p-4">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                  <span className="font-mono text-xs font-semibold text-[var(--fg)]">
                    F{idx + 1} · {f.name}
                  </span>
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      curHp === 0 ? "text-[var(--accent)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {curHp === 0 ? "KO · 0 HP" : `${curHp} HP`}
                    {dmg > 0 ? ` (-${dmg})` : ""}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                  Defending: “{f.option}”
                </p>

                <p className="mt-3 text-xs leading-relaxed text-[var(--fg)]">
                  {arg ?? "Formulating argument..."}
                </p>
              </div>

              {score && (
                <div className="mt-4 border-t border-[var(--border)] pt-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                    <span className="text-[var(--fg)]">
                      Round Total: <strong>{totalOf(score)}/30</strong>
                    </span>
                    <span className="text-[var(--muted)]">
                      L:{score.logic} · E:{score.evidence} · H:{score.honesty}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] italic text-[var(--muted)]">
                    Judge: “{score.reason}”
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rounds.length > 1 && (
        <details className="border border-[var(--border)] bg-[var(--surface)] p-3">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
            Earlier Rounds Transcript ({rounds.length - 1})
          </summary>
          <div className="mt-3 flex flex-col gap-3 border-t border-[var(--border)] pt-3">
            {rounds.slice(0, -1).map((r) => (
              <div key={r.round} className="text-xs">
                <p className="font-mono text-[11px] font-semibold text-[var(--accent)]">
                  Round {r.round}
                </p>
                <div className="mt-1 grid gap-2 sm:grid-cols-2">
                  {fighters.map((f, idx) => (
                    <div key={f.id} className="border border-[var(--border)] bg-[var(--bg)] p-2.5">
                      <p className="font-mono text-[11px] font-semibold">
                        F{idx + 1} · {f.name}
                      </p>
                      <p className="mt-1 text-[var(--muted)]">{r.arguments[f.id]}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
