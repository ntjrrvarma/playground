import type { RoundRecord } from "@/lib/arenaState";
import { totalOf } from "@/lib/engine";
import type { Fighter, Verdict } from "@/lib/types";

export function VerdictView({
  fighters,
  verdict,
  rounds,
  telemetry,
  hp,
  onReset,
}: {
  fighters: Fighter[];
  verdict: Verdict;
  rounds: RoundRecord[];
  telemetry?: Record<string, { tokens: number }>;
  hp: Record<string, number>;
  onReset: () => void;
}) {
  const winner = fighters.find((f) => f.id === verdict.winner) ?? fighters[0];

  return (
    <section className="flex flex-col gap-6 border border-[var(--fg)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
            Director Judge Final Verdict · Confidence {Math.round(verdict.confidence * 100)}%
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--fg)]">
            Winner: {winner?.option}
          </h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="ui-ease border border-[var(--fg)] bg-[var(--bg)] px-4 py-2 font-mono text-xs uppercase tracking-[0.14em] text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]"
        >
          ← Run Another Dilemma
        </button>
      </div>

      <div className="grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
        <div className="bg-[var(--bg)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            Decisive Recommendation
          </p>
          <p className="mt-1.5 text-sm font-medium leading-relaxed text-[var(--fg)]">
            {verdict.recommendation}
          </p>
        </div>
        <div className="bg-[var(--bg)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
            Immediate Next Step
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg)]">{verdict.next_step}</p>
        </div>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Why This Option Won the Arena
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg)]">{verdict.justification}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            Risks to Manage
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[var(--fg)]">
            {verdict.risks.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
            What Would Change This Call
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--fg)]">
            {verdict.what_would_change_this}
          </p>
        </div>
      </div>

      {/* Paperclip-inspired Agent Org Chart & Telemetry Panel */}
      <div className="border-t border-[var(--border)] pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Agent Hierarchy & Token Telemetry (Director → Specialist Control Plane)
        </p>
        <div className="mt-2 overflow-x-auto border border-[var(--border)]">
          <table className="w-full text-left font-mono text-xs tabular-nums">
            <thead className="border-b border-[var(--border)] bg-[var(--bg)] text-[10px] uppercase text-[var(--muted)]">
              <tr>
                <th className="p-2.5">Agent Role</th>
                <th className="p-2.5">Standing HP</th>
                {rounds.map((r) => (
                  <th key={r.round} className="p-2.5">
                    R{r.round}
                  </th>
                ))}
                <th className="p-2.5 text-right">Tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <tr className="bg-[var(--surface)]">
                <td className="p-2.5 font-semibold text-[var(--accent)]">
                  Director · Judge Arbiter
                </td>
                <td className="p-2.5 text-[var(--muted)]">Arbiter</td>
                {rounds.map((r) => (
                  <td key={r.round} className="p-2.5 text-[var(--muted)]">
                    Scored
                  </td>
                ))}
                <td className="p-2.5 text-right">{telemetry?.judge?.tokens ?? 0}</td>
              </tr>
              {fighters.map((f, idx) => (
                <tr key={f.id} className="bg-[var(--surface)]">
                  <td className="p-2.5 font-medium text-[var(--fg)]">
                    Specialist F{idx + 1} · {f.name}
                  </td>
                  <td className="p-2.5">{hp[f.id] ?? 0} HP</td>
                  {rounds.map((r) => {
                    const s = r.scores?.[f.id];
                    return (
                      <td key={r.round} className="p-2.5">
                        {s ? `${totalOf(s)}/30` : "—"}
                      </td>
                    );
                  })}
                  <td className="p-2.5 text-right">{telemetry?.[f.id]?.tokens ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
