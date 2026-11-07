import { validateFightInput } from "@/lib/engine";
import { runFight } from "@/lib/fight";
import { geminiLlm } from "@/lib/llm";
import type { Fighter } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const check = validateFightInput(parsedBody);
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey) {
    return Response.json(
      { error: "Missing GEMINI_API_KEY in environment (.env.local)." },
      { status: 500 },
    );
  }

  const fighters: Fighter[] = check.options.map((opt, idx) => ({
    id: `f${idx + 1}`,
    name: opt.length > 24 ? `${opt.slice(0, 22).trim()}…` : opt,
    option: opt,
  }));

  const encoder = new TextEncoder();
  const llm = geminiLlm(apiKey);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of runFight({ dilemma: check.dilemma, fighters }, llm)) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unexpected stream error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

