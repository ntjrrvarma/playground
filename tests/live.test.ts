import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/fight/route";
import type { FightEvent } from "@/lib/types";

function loadKey() {
  const raw = fs.readFileSync(".env.local", "utf8");
  const match = raw.match(/^GEMINI_API_KEY=(.+)$/m);
  if (match?.[1]) {
    process.env.GEMINI_API_KEY = match[1].trim().replace(/^['"]|['"]$/g, "");
  }
}

async function readSse(res: Response, label: string): Promise<FightEvent[]> {
  const events: FightEvent[] = [];
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const ev = JSON.parse(line.slice(5).trim()) as FightEvent;
      events.push(ev);
      if (ev.type === "score" || ev.type === "verdict" || ev.type === "error") {
        console.log(
          `[${label}]`,
          ev.type,
          "round" in ev ? `R${ev.round}` : "",
          ev.type === "error" ? ev.message : "",
        );
      }
    }
  }
  return events;
}

describe.runIf(Boolean(process.env.LIVE_GEMINI))("Live Gemini E2E fights", () => {
  it(
    "completes a 2-option fight end to end",
    async () => {
      loadKey();
      const res = await POST(
        new Request("http://localhost/api/fight", {
          method: "POST",
          body: JSON.stringify({
            dilemma: "Should our 3-person startup build a modular monolith or microservices first?",
            options: ["Build a modular TypeScript monolith", "Start with Go microservices"],
          }),
        }),
      );
      expect(res.status).toBe(200);
      const events = await readSse(res, "2-opt");
      const last = events.at(-1);
      expect(last?.type).toBe("verdict");
    },
    120_000,
  );

  it(
    "completes a 4-option fight end to end",
    async () => {
      loadKey();
      const res = await POST(
        new Request("http://localhost/api/fight", {
          method: "POST",
          body: JSON.stringify({
            dilemma: "How should I host my new AI portfolio project?",
            options: [
              "Deploy Next.js on a Vercel subdomain",
              "Self-host Docker on a Hetzner VPS",
              "Deploy on Google Cloud Run",
              "Static export on Cloudflare Pages",
            ],
          }),
        }),
      );
      expect(res.status).toBe(200);
      const events = await readSse(res, "4-opt");
      const last = events.at(-1);
      expect(last?.type).toBe("verdict");
    },
    180_000,
  );
});
