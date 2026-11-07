"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Arena } from "@/components/Arena";
import { SpeechPanel } from "@/components/SpeechPanel";
import { VerdictView } from "@/components/VerdictView";
import { initialArenaState, reduceArena } from "@/lib/arenaState";
import { runFight } from "@/lib/fight";
import type { FightEvent, Fighter, Llm } from "@/lib/types";

function buildDemoLlm(fighters: Fighter[]): Llm {
  let roundCounter = 0;
  return {
    async text(prompt) {
      await new Promise((r) => setTimeout(r, 260));
      if (prompt.includes("You are the judge (Director) of a debate")) {
        roundCounter++;
        const out: Record<
          string,
          { logic: number; evidence: number; honesty: number; reason: string }
        > = {};
        fighters.forEach((f, idx) => {
          const boost = idx === 0 ? 2 : idx === 1 && roundCounter % 2 === 0 ? 1 : 0;
          out[f.id] = {
            logic: 7 + boost,
            evidence: 7 + (idx === 0 ? 1 : 0),
            honesty: 8,
            reason: `Concrete trade-off analysis on "${f.name}" in round ${roundCounter}.`,
          };
        });
        return { text: JSON.stringify(out), tokens: 185 };
      }
      if (prompt.includes("is over.")) {
        return {
          text: JSON.stringify({
            winner: fighters[0].id,
            recommendation: `Proceed with "${fighters[0].option}" while setting a 60-day checkpoint metric.`,
            justification:
              "Across all 5 rounds, Fighter 1 defended downside risk with concrete milestones while exposing unverified assumptions in the rival paths.",
            risks: [
              "Execution drift if the 60-day checkpoint criteria are not written down today.",
              "Switching cost if key constraints change mid-quarter.",
            ],
            what_would_change_this:
              "If hard budget or runway constraints drop below 6 months before milestone 1 completes.",
            next_step:
              "Write a 1-page decision memo committing to Option 1 and share it with stakeholders today.",
            confidence: 0.84,
          }),
          tokens: 240,
        };
      }
      const match = prompt.match(/You defend ONLY this option: "([^"]+)"/);
      const opt = match?.[1] ?? "this option";
      return {
        text: `"${opt}" gives the highest asymmetric upside per unit of risk. Rival options rely on optimistic timelines, whereas this path delivers verifiable signal within 30 days and preserves optionality.`,
        tokens: 110,
      };
    },
  };
}

export default function ArenaPage() {
  const router = useRouter();
  const [setup] = useState<{ dilemma: string; options: string[] } | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem("dilemma-arena:setup");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { dilemma: string; options: string[] };
    } catch {
      return null;
    }
  });

  const fighters: Fighter[] = useMemo(
    () =>
      (setup?.options ?? []).map((opt, idx) => ({
        id: `f${idx + 1}`,
        name: opt.length > 24 ? `${opt.slice(0, 22).trim()}…` : opt,
        option: opt,
      })),
    [setup],
  );

  const [state, setState] = useState(() => initialArenaState(fighters));
  const [running, setRunning] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const startLiveFight = useCallback(
    async (signal?: AbortSignal) => {
      if (!setup || fighters.length < 2) return;
      setDemoMode(false);
      setRunning(true);
      setState(initialArenaState(fighters));

      try {
        const res = await fetch("/api/fight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(setup),
          signal,
        });

        if (!res.ok || !res.body) {
          const payload = (await res.json().catch(() => ({}))) as { error?: string };
          setState((prev) =>
            reduceArena(prev, {
              type: "error",
              message: payload.error ?? `Request failed (${res.status})`,
            }),
          );
          setRunning(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() ?? "";

          for (const chunk of chunks) {
            const line = chunk.trim();
            if (!line.startsWith("data:")) continue;
            const event = JSON.parse(line.slice(5).trim()) as FightEvent;
            setState((prev) => reduceArena(prev, event));
          }
        }
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setState((prev) =>
          reduceArena(prev, {
            type: "error",
            message: err instanceof Error ? err.message : "Stream interrupted",
          }),
        );
      } finally {
        setRunning(false);
      }
    },
    [setup, fighters],
  );

  async function startSimulatedFight() {
    if (!setup || fighters.length < 2) return;
    setDemoMode(true);
    setRunning(true);
    setState(initialArenaState(fighters));
    const llm = buildDemoLlm(fighters);
    for await (const ev of runFight({ dilemma: setup.dilemma, fighters }, llm)) {
      setState((prev) => reduceArena(prev, ev));
    }
    setRunning(false);
  }

  useEffect(() => {
    if (!setup) {
      router.replace("/");
      return;
    }
    const ctrl = new AbortController();
    void startLiveFight(ctrl.signal);
    return () => ctrl.abort();
  }, [setup, router, startLiveFight]);

  if (!setup) return null;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
            {demoMode ? "Simulated Arena Bout" : "Live Gemini Arena Bout"} ·{" "}
            {running ? "In Progress" : "Completed"}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--fg)]">
            {setup.dilemma}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void startSimulatedFight()}
            disabled={running}
            className="ui-ease border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
          >
            Simulate Bout (No API Key)
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="ui-ease border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]"
          >
            ← New Dilemma
          </button>
        </div>
      </header>

      {state.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 border border-[var(--accent)] bg-[var(--surface)] p-4"
        >
          <div>
            <p className="font-mono text-xs font-semibold text-[var(--accent)]">
              Arena Stream Notice: {state.error}
            </p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Add GEMINI_API_KEY to .env.local for live Gemini judging, or run the built-in
              simulation to watch the full 5-round colosseum bout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void startSimulatedFight()}
            className="ui-ease bg-[var(--accent)] px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-white hover:opacity-90"
          >
            Run Simulated Bout →
          </button>
        </div>
      )}

      <Arena fighters={fighters} state={state} />

      {state.verdict && (
        <VerdictView
          fighters={fighters}
          verdict={state.verdict}
          rounds={state.rounds}
          telemetry={state.telemetry}
          hp={state.hp}
          onReset={() => router.push("/")}
        />
      )}

      {state.rounds.length > 0 && (
        <SpeechPanel fighters={fighters} rounds={state.rounds} hp={state.hp} />
      )}
    </main>
  );
}
