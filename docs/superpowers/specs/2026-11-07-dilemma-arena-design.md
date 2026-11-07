# Dilemma Arena: Design

## Intent
A person has a dilemma. Two or more AI agents, each defending one option, fight in a graphical colosseum. A separate judge agent scores every round. The result is a **clear recommendation with a justification** the person can act on. The fight keeps the exercise engaging. The verdict is the point.

## Goals
- Enter a dilemma plus 2-4 options, and get a decisive recommendation with reasons.
- Watch a pixel-art colosseum fight in which argument strength drives the hits.
- Verdict page: winner, why it won, strongest argument for each loser, risks, a "what would change this call" line, and a next step.

## Non-goals
Accounts, saved history, multiplayer, mobile polish, sound, real combat mechanics.

## Anti-goals
- A fight that looks good but ends in a vague "it depends".
- Scores that don't trace back to what the agents actually said.

## Constraints
- Next.js 16 App Router, React 19, TypeScript, Tailwind v4.
- Gemini API, called only from the server. The key lives in `.env.local`, which is gitignored.
- No external art assets.

## Approaches considered
- **A. 2D pixel-art arena on Canvas (chosen).** Fastest route to the colosseum look, with effort left for the debate engine.
- **B. 3D arena (React Three Fiber).** Most impressive, but asset and camera work would crowd out the debate engine. Possible later, since the engine is separate from the renderer.
- **C. Minimal cards and health bars.** Cheapest, but loses the arena.

The user said "anything should be fine". A is my call, not an agreed choice.

## Design

### Flow
1. **Setup screen:** dilemma text, 2-4 options (each becomes a fighter), and a "Fight" button.
2. **Arena screen:** colosseum canvas, with a speech panel under each fighter.
3. **Verdict screen:** the recommendation, with a "Run again" button.

### Debate engine (server, `/api/fight`)
- Streams events to the client over SSE: `round_start`, `argument`, `rebuttal`, `score`, `ko`, `verdict`.
- Each fighter is one Gemini call with a persona prompt: "defend option X, be honest, attack the others' weak points".
- Fixed 5 rounds. Each round, every fighter argues once and responds to the strongest opposing point.
- A separate **judge** call per round returns JSON: for each fighter, scores 0-10 for logic, evidence and honesty, plus a one-line reason quoting the argument.
- Damage = (opponent score − own score), clamped to a minimum of 0. HP starts at 100. A fighter at 0 HP is knocked out. If more than one fighter is still standing after round 5, the judge decides by HP.
- A final judge call returns the verdict JSON: `winner`, `recommendation`, `justification`, `risks[]`, `what_would_change_this`, `next_step`, `confidence`.

### Renderer (client)
- Canvas 2D. Procedural pixel fighters, an oval colosseum with a crowd of dots, and HP bars.
- Animation states per fighter: idle, attack, hit, KO. The score events trigger them.
- The engine emits events, and the renderer only consumes them. This keeps option B open later.

### Structure
`app/page.tsx` (setup), `app/arena/`, `app/api/fight/route.ts`, `lib/engine.ts` (rounds and damage), `lib/prompts.ts`, `lib/types.ts` (event types), `components/Arena.tsx`.

### Playbook repos used (from `AI_ECOSYSTEM_PLAYBOOK.md`)
- **`patch-gg/pixelfx`:** hit sparks, KO bursts and crowd-cheer particles. Uses its pixel-art JS shaders if they integrate cleanly with the Canvas. Otherwise the renderer falls back to simple procedural particles. The builder checks this first and reports which.
- **`Donchitos/Claude-Code-Game-Studios`:** pattern only (no dependency). The Director → Lead → Specialist hierarchy shapes the agents: the **judge is the Director**, each fighter is a **Specialist** for one option. Optionally, a "Lead" agent merges the round scores. The prompts in `lib/prompts.ts` follow this layout.
- **`paperclipai/paperclip`:** pattern only. The verdict screen gets a small panel showing each agent, its round-by-round scores and its token use, in the spirit of its agent org-chart and token-budget view.
- **`shadcn-ui/ui`:** setup form, verdict cards and buttons.
- **Skills already in `.agents/`:** `vercel-nextjs-react` (Next.js 16 / React 19 / Tailwind v4), `emil-design-eng` (UI motion under 300ms, canvas pauses when off-screen), `hallmark-ui-audit` (a bespoke look, not generic AI styling).
- **Not used:** `godot-mcp` and `UnrealClaude` (this is a web app, not an engine project), `VoiceStudio` and `ACE-Step` (audio is a non-goal for v1, and could be a v2 addition).

## Builder's decisions
- Damage formula, round count, and the judge's three scoring criteria are my calls.
- Model name defaults to a Gemini Flash model, set in one constant.
- If the API key is missing, the setup screen shows a clear error.

## Left to the builder
Exact pixel art, colours, the stream format details, and the prompt wording.

