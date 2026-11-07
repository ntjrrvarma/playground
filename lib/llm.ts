import { GoogleGenAI } from "@google/genai";
import type { JudgedScores, Llm, Verdict } from "@/lib/types";

export const MODEL = "gemini-3.1-flash-lite";

export function geminiLlm(apiKey: string): Llm {
  const ai = new GoogleGenAI({ apiKey });
  let rateLimitUntil = 0;

  return {
    async text(prompt) {
      let lastErr: unknown;
      for (let attempt = 0; attempt < 6; attempt++) {
        const waitMs = rateLimitUntil - Date.now();
        if (waitMs > 0) await new Promise((r) => setTimeout(r, waitMs));
        try {
          const res = await ai.models.generateContent({
            model: MODEL,
            contents: prompt,
            config: { abortSignal: AbortSignal.timeout(15_000) },
          });
          return { text: res.text ?? "", tokens: res.usageMetadata?.totalTokenCount ?? 0 };
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err);
          const isTimeout =
            msg.includes("timed out") ||
            msg.includes("aborted") ||
            msg.includes("AbortError") ||
            (err as { name?: string })?.name === "TimeoutError";
          if (
            (isTimeout ||
              msg.includes("429") ||
              msg.includes("503") ||
              msg.includes("RESOURCE_EXHAUSTED")) &&
            attempt < 5
          ) {
            const delayMatch = msg.match(/"retryDelay"\s*:\s*"(\d+)s"/);
            const delaySec = delayMatch
              ? Number(delayMatch[1]) + 2
              : msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")
                ? 20
                : 2;
            rateLimitUntil = Math.max(rateLimitUntil, Date.now() + delaySec * 1000);
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    },
  };
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("No JSON object in model reply");
  return JSON.parse(cleaned.slice(start, end + 1));
}

const clamp = (n: unknown) => Math.min(10, Math.max(0, Number(n) || 0));

export function parseJudge(raw: string, fighterIds: string[]): Record<string, JudgedScores> {
  const obj = parseJsonObject(raw);
  const out: Record<string, JudgedScores> = {};
  for (const id of fighterIds) {
    const s = obj[id] as Record<string, unknown> | undefined;
    if (!s || typeof s !== "object") throw new Error(`Judge reply is missing fighter ${id}`);
    out[id] = {
      logic: clamp(s.logic),
      evidence: clamp(s.evidence),
      honesty: clamp(s.honesty),
      reason: String(s.reason ?? ""),
    };
  }
  return out;
}

export function parseVerdict(raw: string): Verdict {
  const o = parseJsonObject(raw);
  for (const key of ["winner", "recommendation", "justification", "what_would_change_this", "next_step"]) {
    if (typeof o[key] !== "string" || !(o[key] as string).trim()) {
      throw new Error(`Verdict is missing ${key}`);
    }
  }
  return {
    winner: o.winner as string,
    recommendation: o.recommendation as string,
    justification: o.justification as string,
    risks: Array.isArray(o.risks) ? o.risks.map(String) : [],
    what_would_change_this: o.what_would_change_this as string,
    next_step: o.next_step as string,
    confidence: Math.min(1, Math.max(0, Number(o.confidence) || 0)),
  };
}

