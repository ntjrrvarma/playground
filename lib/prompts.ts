import type { Fighter } from "@/lib/types";

/** Director = judge, Specialist = fighter (pattern from Claude-Code-Game-Studios). */

export function fighterPrompt(args: {
  dilemma: string;
  fighter: Fighter;
  rivals: Fighter[];
  round: number;
  previous: { fighterId: string; text: string }[];
}): string {
  const { dilemma, fighter, rivals, round, previous } = args;
  const history = previous.length
    ? previous
        .map((p) => `- ${[fighter, ...rivals].find((f) => f.id === p.fighterId)?.name}: ${p.text}`)
        .join("\n")
    : "(first round, no arguments yet)";
  return `You are ${fighter.name}, a debater in an arena. A person has this dilemma:
"${dilemma}"
You defend ONLY this option: "${fighter.option}".
Your rivals defend: ${rivals.map((r) => `"${r.option}"`).join(", ")}.

Round ${round}. Arguments from the last round:
${history}

Make your strongest honest argument in 60-90 words. Attack the weakest point of the strongest rival, and back your claims with concrete reasons. Do not invent facts about the person. Plain text only.`;
}

export function judgePrompt(args: {
  dilemma: string;
  round: number;
  arguments: { fighter: Fighter; text: string }[];
}): string {
  const list = args.arguments
    .map((a) => `[${a.fighter.id}] ${a.fighter.name} (defends "${a.fighter.option}"): ${a.text}`)
    .join("\n\n");
  return `You are the judge (Director) of a debate about this dilemma: "${args.dilemma}"
Round ${args.round} arguments:

${list}

Score each fighter from 0 to 10 on: logic, evidence, honesty (no invented facts, acknowledges trade-offs).
In "reason", quote the part of the argument that decided the score.
Reply with JSON ONLY, no prose, shaped exactly like:
{"<fighter id>": {"logic": 0, "evidence": 0, "honesty": 0, "reason": "..."}, ...}
Include every fighter id: ${args.arguments.map((a) => a.fighter.id).join(", ")}.`;
}

export function verdictPrompt(args: {
  dilemma: string;
  winner: Fighter;
  fighters: Fighter[];
  transcript: string;
}): string {
  return `You are the judge (Director). The debate about "${args.dilemma}" is over.
The winner on points is ${args.winner.name} (id ${args.winner.id}), defending "${args.winner.option}".
Full transcript with scores:
${args.transcript}

Give the person a decisive recommendation. NEVER answer "it depends" as the recommendation. Reply with JSON ONLY:
{"winner": "${args.winner.id}", "recommendation": "...", "justification": "why, citing the strongest arguments", "risks": ["..."], "what_would_change_this": "...", "next_step": "one concrete action", "confidence": 0.0}`;
}

