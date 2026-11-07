"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validateFightInput } from "@/lib/engine";

const PRESETS: { label: string; dilemma: string; options: string[] }[] = [
  {
    label: "Career · Startup vs Staff Role",
    dilemma:
      "I have two offers: founding engineer #2 at an AI seed startup with 24 months runway, or Staff Cloud Architect at a profitable enterprise with 40% higher base pay.",
    options: [
      "Join the seed AI startup as founding engineer",
      "Take the Staff Cloud Architect enterprise offer",
      "Negotiate advisory equity with startup while taking Staff role",
    ],
  },
  {
    label: "Architecture · Monolith vs Microservices",
    dilemma:
      "We are launching a real-time multi-agent telemetry SaaS with a 4-engineer team and need to ship v1 in 8 weeks while supporting enterprise SSO and high-throughput event streams.",
    options: [
      "Modular TypeScript monolith + Postgres + Redis streams",
      "Polyglot Go/Python microservices on Kubernetes from day one",
    ],
  },
  {
    label: "Product · Local-First vs Cloud SaaS",
    dilemma:
      "Should our developer AI companion run 100% locally via Ollama/SQLite or use cloud frontier APIs with managed vector storage?",
    options: [
      "100% local-first (zero API cost, strict privacy)",
      "Cloud frontier APIs (highest reasoning quality, instant setup)",
      "Hybrid local memory + user-supplied BYOK cloud routing",
    ],
  },
];

export function SetupForm() {
  const router = useRouter();
  const [dilemma, setDilemma] = useState(PRESETS[0].dilemma);
  const [options, setOptions] = useState<string[]>(PRESETS[0].options);
  const [submitted, setSubmitted] = useState(false);

  const check = validateFightInput({ dilemma, options });

  function updateOption(idx: number, val: string) {
    setOptions((prev) => prev.map((item, i) => (i === idx ? val : item)));
  }

  function addOption() {
    if (options.length < 4) setOptions((prev) => [...prev, ""]);
  }

  function removeOption(idx: number) {
    if (options.length > 2) setOptions((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (!check.ok) return;
    sessionStorage.setItem(
      "dilemma-arena:setup",
      JSON.stringify({ dilemma: check.dilemma, options: check.options }),
    );
    router.push("/arena");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
          Presets:
        </span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => {
              setDilemma(p.dilemma);
              setOptions(p.options);
              setSubmitted(false);
            }}
            className="ui-ease border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-mono text-xs text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <label
          htmlFor="dilemma-input"
          className="block font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]"
        >
          01 / The Dilemma
        </label>
        <textarea
          id="dilemma-input"
          rows={3}
          value={dilemma}
          onChange={(e) => setDilemma(e.target.value)}
          placeholder="Describe the decision, constraints, and what is at stake..."
          className="mt-2 w-full resize-y border border-[var(--border)] bg-[var(--bg)] p-3 text-sm leading-relaxed text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none"
        />
      </div>

      <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
            02 / Contending Options (2–4 Fighters)
          </span>
          {options.length < 4 && (
            <button
              type="button"
              onClick={addOption}
              className="ui-ease border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 font-mono text-xs uppercase tracking-wider text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-[0.98]"
            >
              + Add Fighter ({options.length}/4)
            </button>
          )}
        </div>

        <div className="mt-3 grid gap-3">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-[var(--border)] bg-[var(--bg)] font-mono text-xs font-semibold text-[var(--accent)] tabular-nums">
                F{idx + 1}
              </span>
              <input
                type="text"
                value={opt}
                onChange={(e) => updateOption(idx, e.target.value)}
                placeholder={`Option ${idx + 1} (this agent will defend it ruthlessly)`}
                aria-label={`Fighter ${idx + 1} option`}
                className="h-9 w-full border border-[var(--border)] bg-[var(--bg)] px-3 text-sm text-[var(--fg)] focus:border-[var(--accent)] focus:outline-none"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  aria-label={`Remove fighter ${idx + 1}`}
                  className="ui-ease h-9 shrink-0 border border-[var(--border)] px-2.5 font-mono text-xs text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {(!check.ok || submitted) && !check.ok && (
        <p
          role="alert"
          className="border border-[var(--accent)] bg-[var(--surface)] px-4 py-2.5 font-mono text-xs text-[var(--accent)]"
        >
          {check.error}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <span className="font-mono text-xs text-[var(--muted)] tabular-nums">
          {options.length} specialist agents · 1 director judge · max 5 rounds
        </span>
        <button
          type="submit"
          disabled={!check.ok}
          className="ui-ease bg-[var(--accent)] px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-white hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Enter the Colosseum →
        </button>
      </div>
    </form>
  );
}
