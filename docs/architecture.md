# Dilemma Arena: Architecture and Flow

See the [design](superpowers/specs/2026-11-07-dilemma-arena-design.md) and the [implementation plan](superpowers/plans/2026-11-07-dilemma-arena.md).

## 1. User journey
```mermaid
flowchart LR
  A["Setup: dilemma + 2-4 options"] --> B["Arena: 5 rounds of argument and judging"]
  B --> C{"KO or round 5?"}
  C -->|"no"| B
  C -->|"yes"| D["Verdict: recommendation + justification"]
  D --> E["Run again"]
  E --> A
```

## 2. System components
```mermaid
flowchart TD
  UI["Setup form and Arena page (client)"] -->|"POST /api/fight"| R["Route handler (SSE)"]
  R --> F["runFight generator (lib/fight.ts)"]
  F --> P["Prompts (Director → Specialist)"]
  F --> L["Llm interface"]
  L --> G["Gemini API"]
  F --> E["Engine: damage, HP, winner"]
  F -->|"FightEvent stream"| R
  R -->|"SSE"| UI
  UI --> S["reduceArena state"]
  S --> V["Canvas renderer + pixelfx"]
  S --> SP["Speech panels and verdict view"]
```

## 3. One round
```mermaid
sequenceDiagram
  participant C as Client
  participant S as Server (runFight)
  participant F as Fighter agents
  participant J as Judge
  C->>S: start fight
  loop each round (max 5)
    S-->>C: round_start
    S->>F: argue (sees last round's rivals)
    F-->>S: arguments
    S-->>C: argument events
    S->>J: score all arguments
    J-->>S: scores + reasons (JSON)
    S-->>C: score (damage, hp)
  end
  S->>J: final verdict
  J-->>S: recommendation JSON
  S-->>C: verdict + telemetry
```

## 4. Fighter state
```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> attack: highest round score
  idle --> hit: takes damage
  attack --> idle: next round
  hit --> idle: next round
  hit --> ko: HP reaches 0
  ko --> [*]
```

## 5. Damage rule
Round total per fighter = logic + evidence + honesty (0-30). Damage to a fighter = `max(0, highest total among the others − own total)`. HP starts at 100.

## 6. Task order
```mermaid
flowchart LR
  T1["1 Scaffold"] --> T2["2 Engine"] --> T3["3 Prompts + LLM"] --> T4["4 Orchestration"] --> T5["5 SSE route"]
  T5 --> T6["6 Setup screen"]
  T5 --> T7["7 Arena renderer"]
  T6 --> T8["8 Arena + verdict screens"]
  T7 --> T8 --> T9["9 Audit + verification"]
```

