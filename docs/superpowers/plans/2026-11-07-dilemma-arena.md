# Dilemma Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Complete (Tasks 1–9 implemented, 36/36 tests passing, `tsc`, `eslint`, and `next build` clean; only live `GEMINI_API_KEY` manual run awaits user key in `.env.local`).

**Goal:** A web app where 2-4 AI agents, each defending one option of the user's dilemma, fight in a pixel-art colosseum, scored by a judge agent, ending in a justified recommendation.

**Architecture:** A pure TypeScript debate engine (`lib/`) emits typed `FightEvent`s from an async generator. A server route streams them over SSE. The client Canvas renderer and UI only consume events. The LLM sits behind an `Llm` interface so the engine is testable with a fake.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Vitest, `@google/genai`, Canvas 2D, procedural `pixelfx`-style pixel bursts.

**Spec:** `docs/superpowers/specs/2026-11-07-dilemma-arena-design.md`
**Diagrams:** `docs/architecture.md`

## Global Constraints
- Next.js 16 App Router, React 19, TypeScript, Tailwind v4.
- Gemini API is called from the server only. The key lives in `GEMINI_API_KEY` in `.env.local`, which is gitignored.
- 2-4 fighters, 5 rounds, HP starts at 100, a fighter at 0 HP is knocked out.
- Judge scores each fighter 0-10 on `logic`, `evidence`, `honesty`.
- Model name is one constant: `MODEL` in `lib/llm.ts`.
- No external art assets. UI motion under 300ms (`emil-design-eng`). Audio, accounts and persistence are out of scope.
- **Plan decision (the spec's formula only covers 2 fighters):** round total `t_i` = logic + evidence + honesty (0-30). Damage to fighter `i` = `max(0, maxOtherTotal − t_i)`, where `maxOtherTotal` is the highest total among the other fighters.

## Review Focus
1. Empty dilemma, fewer than 2 options, or blank/duplicate option text: the form blocks submission with a message.
2. Judge returns malformed or out-of-range JSON: retry once, then clamp scores to 0-10, and fail the fight cleanly if the retry also fails.
3. Gemini fails mid-fight (network, quota): the client shows an error and keeps the rounds already played.
4. Missing `GEMINI_API_KEY`: a clear setup error appears before any fight starts.
5. Tied HP after round 5, or everyone knocked out in the same round: the judge breaks the tie from total scores. Never end with "no winner".

## File Structure
| File | Responsibility |
|---|---|
| `lib/types.ts` | `Fighter`, `Scores`, `FightEvent`, `Verdict`, `Llm` |
| `lib/engine.ts` | Pure scoring, damage, HP, winner, and input validation logic |
| `lib/prompts.ts` | Fighter, judge and verdict prompts (Director → Specialist layout) |
| `lib/llm.ts` | Gemini `Llm` implementation, JSON parse with retry |
| `lib/fight.ts` | `runFight` async generator (rounds, events) |
| `lib/arenaState.ts` | Pure `reduceArena` state reducer for rounds, HP, and animations |
| `app/api/fight/route.ts` | POST, validates input, streams SSE |
| `components/SetupForm.tsx` | Dilemma and options form with presets |
| `components/Arena.tsx` | Canvas renderer, consumes events |
| `components/SpeechPanel.tsx` | Per-fighter argument text |
| `components/VerdictView.tsx` | Verdict card and agent telemetry panel |
| `app/page.tsx`, `app/arena/page.tsx` | Screens |
| `tests/*.test.ts` | Vitest tests next to the units above |

---

### Task 1: Scaffold project ✅ (`0bcafb8`)
**Files:** Create the Next.js app in repo root, `vitest.config.ts`, `.env.example`; modify `.gitignore` (append, keep existing lines).
**Interfaces:** Produces `npm test` (Vitest) and `npm run build`.
- [x] **Step 1:** Scaffold with `create-next-app` (TypeScript, Tailwind, App Router, no `src/`), keeping `docs/`, `.agents/`, and the playbook untouched.
- [x] **Step 2:** Install `vitest`, `@google/genai`, and configure `@tailwindcss/postcss` + editorial CSS variables (`--bg`, `--fg`, `--accent`, `--muted`, `--border`, `--surface`).
- [x] **Step 3:** Add `.env.example` with `GEMINI_API_KEY=`, and make sure `.env.local` is gitignored.
- [x] **Step 4:** Run `npm test -- --run` (expected: "no tests found" exits cleanly, using `passWithNoTests`) and `npm run build` (expected: success).
- [x] **Step 5:** Commit `chore: scaffold next app with vitest`.

### Task 2: Types and engine ✅ (`b2a2bdc`)
**Files:** Create `lib/types.ts`, `lib/engine.ts`, `tests/engine.test.ts`.
**Interfaces:**
- Produces:
  - `type Fighter = { id: string; name: string; option: string }`
  - `type Scores = { logic: number; evidence: number; honesty: number }`
  - `computeDamage(totals: Record<string, number>): Record<string, number>`
  - `applyDamage(hp: Record<string, number>, dmg: Record<string, number>): Record<string, number>` (floors at 0)
  - `standing(hp): string[]`
  - `pickWinner(hp, totalScores: Record<string, number>): string` (highest HP, tie broken by highest total score, then first listed)
  - `totalOf(s: Scores): number`
- [x] **Step 1:** Write failing tests: `computeDamage({a:25,b:20})` → `{a:0,b:5}`; three fighters `{a:25,b:20,c:10}` → `{a:0,b:5,c:15}`; equal totals → all 0; `applyDamage` floors at 0; `pickWinner` tie-break cases, including everyone at 0 HP.
- [x] **Step 2:** Run `npx vitest run tests/engine.test.ts` (expected: FAIL).
- [x] **Step 3:** Implement the functions above in `lib/engine.ts`, using the damage formula under Global Constraints.
- [x] **Step 4:** Run the same command (expected: PASS — 11/11 tests passed).
- [x] **Step 5:** Commit `feat: pure debate engine`.

### Task 3: Prompts and LLM client ✅ (`ff77b84`)
**Files:** Create `lib/prompts.ts`, `lib/llm.ts`, `tests/llm.test.ts`.
**Interfaces:**
- Consumes: `Fighter`, `Scores` (Task 2).
- Produces:
  - `interface Llm { text(prompt: string): Promise<{ text: string; tokens: number }> }`
  - `geminiLlm(apiKey: string): Llm`
  - `parseJudge(raw: string, fighterIds: string[]): Record<string, Scores & { reason: string }>` (strips code fences, clamps 0-10, throws on missing fighter)
  - `parseVerdict(raw: string): Verdict`, where `Verdict = { winner: string; recommendation: string; justification: string; risks: string[]; what_would_change_this: string; next_step: string; confidence: number }`
  - `fighterPrompt`, `judgePrompt`, `verdictPrompt`
- [x] **Step 1:** Write failing tests for `parseJudge`: valid JSON, JSON wrapped in code fences, score 14 clamped to 10, missing fighter throws; and `parseVerdict` rejects missing `recommendation`.
- [x] **Step 2:** Run `npx vitest run tests/llm.test.ts` (expected: FAIL).
- [x] **Step 3:** Implement parsers in `lib/llm.ts` and the prompts in `lib/prompts.ts`. The judge prompt must demand JSON only and quote the argument in `reason`. The verdict prompt must forbid "it depends" as a recommendation.
- [x] **Step 4:** Implement `geminiLlm` using `@google/genai` and the `MODEL` constant. Report tokens from usage metadata.
- [x] **Step 5:** Run tests (expected: PASS — 7/7 tests passed). Commit `feat: prompts, parsers, gemini client`.

### Task 4: Fight orchestration ✅ (`a2aa410`)
**Files:** Create `lib/fight.ts`, `tests/fight.test.ts`.
**Interfaces:**
- Consumes: Tasks 2 and 3.
- Produces:
  - `type FightEvent = { type: 'round_start'; round: number } | { type: 'argument'; fighterId: string; text: string; round: number } | { type: 'score'; round: number; scores: Record<string, Scores & { reason: string }>; damage: Record<string, number>; hp: Record<string, number> } | { type: 'ko'; fighterId: string } | { type: 'verdict'; verdict: Verdict; telemetry: Record<string, { tokens: number }> } | { type: 'error'; message: string }`
  - `runFight(input: { dilemma: string; fighters: Fighter[] }, llm: Llm): AsyncGenerator<FightEvent>`
- [x] **Step 1:** Write failing tests with a fake `Llm`: 2 fighters play 5 rounds (event order `round_start`, `argument` ×2, `score`); a fight ends early with `ko` and `verdict`; a malformed judge reply is retried once; two failures yield an `error` event after the earlier events.
- [x] **Step 2:** Run `npx vitest run tests/fight.test.ts` (expected: FAIL).
- [x] **Step 3:** Implement `runFight`. Each fighter's argument sees the other fighters' previous-round arguments. After the last round or a single survivor, call the verdict prompt. The verdict's `winner` must equal `pickWinner`'s result (override if the model disagrees).
- [x] **Step 4:** Run tests (expected: PASS — 7/7 tests passed). Commit `feat: fight orchestration`.

### Task 5: SSE route ✅ (`3094398`)
**Files:** Create `app/api/fight/route.ts`, `tests/route.test.ts`.
**Interfaces:** Consumes `runFight`, `geminiLlm`. Produces `POST /api/fight` taking `{ dilemma: string; options: string[] }`, responding `text/event-stream`, one `data: <FightEvent JSON>` per event.
- [x] **Step 1:** Write failing tests: 400 for empty dilemma, <2 or >4 options, blank or duplicate options; 500 with a clear message when `GEMINI_API_KEY` is unset.
- [x] **Step 2:** Run `npx vitest run tests/route.test.ts` (expected: FAIL).
- [x] **Step 3:** Implement validation (`validateFightInput` in `lib/engine.ts`), build fighters (`id` = `f1`…, `name` from the option), and stream events from `runFight`.
- [x] **Step 4:** Run tests (expected: PASS — 7/7 tests passed). Commit `feat: fight SSE route`.

### Task 6: Setup screen ✅ (`1010572`)
**Files:** Create `components/SetupForm.tsx`, modify `app/page.tsx`.
**Interfaces:** Produces `SetupForm` that, on submit, stores `{dilemma, options}` in `sessionStorage` and navigates to `/arena`.
- [x] **Step 1:** Implement the form with bespoke editorial styling: dilemma textarea, 2-4 option inputs (add/remove), 3 one-click presets, a Fight button disabled until valid, and inline messages for Review Focus item 1.
- [x] **Step 2:** Verify validation via `validateFightInput` unit coverage and production build check.
- [x] **Step 3:** Commit `feat: setup screen`.

### Task 7: Arena renderer ✅ (`5dafd9e`)
**Files:** Create `components/Arena.tsx`, `lib/arenaState.ts`, `tests/arenaState.test.ts`.
**Interfaces:**
- Consumes: `FightEvent`.
- Produces:
  - `reduceArena(state: ArenaState, e: FightEvent): ArenaState`, a pure reducer (hp, current animation per fighter: `idle | attack | hit | ko`, round number)
  - `<Arena fighters={Fighter[]} state={ArenaState} />`
- [x] **Step 1:** Write failing reducer tests: `score` with damage sets the damaged fighter's animation to `hit` and the leader's to `attack`; `ko` sets `ko`; `round_start` resets animations to `idle`.
- [x] **Step 2:** Run `npx vitest run tests/arenaState.test.ts` (expected: FAIL).
- [x] **Step 3:** Implement the reducer, then `Arena.tsx`: oval colosseum, dotted crowd, procedural pixel fighters, HP bars, `requestAnimationFrame` loop pausing when the canvas is off-screen (`IntersectionObserver`).
- [x] **Step 4:** Checked `pixelfx`: implemented grid-snapped procedural pixel bursts (hit sparks, attack bursts, KO shockwaves) directly in `Arena.tsx` and recorded in commit `5dafd9e`.
- [x] **Step 5:** Run tests (expected: PASS — 3/3 tests passed). Commit `feat: arena renderer`.

### Task 8: Arena and verdict screens ✅ (`1fce8e5`)
**Files:** Create `components/SpeechPanel.tsx`, `components/VerdictView.tsx`, `app/arena/page.tsx`, `tests/smoke.test.ts`.
**Interfaces:** Consumes `reduceArena`, `Arena`, and the SSE route.
- [x] **Step 1:** In `app/arena/page.tsx`, read `sessionStorage`, POST to `/api/fight`, parse the stream, feed events to `reduceArena`, and keep arguments per fighter for `SpeechPanel` (plus a built-in `Simulate Bout (No API Key)` fallback mode).
- [x] **Step 2:** On `error`, show the message and keep the played rounds (Review Focus item 3).
- [x] **Step 3:** `VerdictView`: winner, recommendation, justification, risks, what would change this, next step, confidence, plus a telemetry panel (per-agent round scores and tokens, inspired by `paperclip`). Include a "Run Another Dilemma" button.
- [x] **Step 4:** Add a smoke test (`tests/smoke.test.ts`) that runs `runFight` with a fake `Llm` for 3 fighters and asserts the last event is `verdict` with a winner among the fighter ids.
- [x] **Step 5:** Run `npx vitest run` (expected: all PASS — 36/36 tests passed). Commit `feat: arena and verdict screens, audits, and verification`.

### Task 9: Audit and verification ✅ (`1fce8e5`)
**Files:** Modify only what the audits flag.
- [x] **Step 1:** Run `hallmark-ui-audit` and `emil-design-eng` over the three screens and verify editorial palette (`#F9F8F6`, `#111110`, `#C8501A`, `#E4E0D8`, `#FFFFFF`), exposed `1px` hairline grids, `tabular-nums`, `cubic-bezier(0.16, 1, 0.3, 1)` `<300ms` transitions, and `IntersectionObserver` canvas pausing.
- [x] **Step 2:** Run `npx tsc --noEmit`, `npm run lint`, `npm run build`, `npx vitest run` (all clean: 0 errors, 0 warnings, 36/36 tests passing).
- [ ] **Step 3:** With a real `GEMINI_API_KEY` in `.env.local`, run one 2-option fight end to end and one 4-option fight (simulated mode is verified; live Gemini run awaits user API key).
- [x] **Step 4:** Commit `feat: arena and verdict screens, audits, and verification`.

---

## Self-Review
- **Spec coverage:** setup flow (T5, T6), debate engine and judge (T2-T4), SSE (T5), renderer and `pixelfx` (T7), verdict and telemetry (T8), audits (T9). Each is covered by a task.
- **Type consistency:** `Fighter`, `Scores`, `Verdict`, `Llm` and `FightEvent` are defined once (T2-T4) and reused with the same names.
- **Gap fixed:** the spec's damage formula covered only 2 fighters. The multi-fighter version is stated under Global Constraints and in T2's tests.
- **Proportion:** the plan holds signatures, tests and decisions, not implementation bodies.
