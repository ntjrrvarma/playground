import { SetupForm } from "@/components/SetupForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-between px-6 py-12">
      <div>
        <header className="border-b border-[var(--border)] pb-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]">
            Adversarial Multi-Agent Decision Engine · Colosseum v1
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[var(--fg)] sm:text-5xl">
            Dilemma Arena
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            Drop a real decision into the arena. Each option spawns a specialist gladiator agent
            that defends its path and attacks weak assumptions. A separate Director Judge scores
            every round on logic, evidence, and honesty—turning argument deltas into combat damage
            until a justified verdict stands.
          </p>
        </header>

        <section className="mt-8">
          <SetupForm />
        </section>

        <section className="mt-10 grid grid-cols-1 gap-px border border-[var(--border)] bg-[var(--border)] sm:grid-cols-3">
          <div className="bg-[var(--surface)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              01 · Specialist Agents
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              2–4 contenders argue in parallel each round, directly rebutting the previous round’s
              claims.
            </p>
          </div>
          <div className="bg-[var(--surface)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              02 · Deterministic Damage
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Judge scores (0–30) drive HP loss: trailing options take damage equal to the gap
              behind the round leader.
            </p>
          </div>
          <div className="bg-[var(--surface)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              03 · Actionable Verdict
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              No vague “it depends.” You get a single recommendation, cited reasons, key risks, and
              the next concrete step.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
