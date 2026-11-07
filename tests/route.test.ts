import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/fight/route";

const req = (body: unknown) =>
  new Request("http://localhost/api/fight", { method: "POST", body: JSON.stringify(body) });

afterEach(() => vi.unstubAllEnvs());

describe("POST /api/fight validation", () => {
  it("400 for an empty dilemma", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const res = await POST(req({ dilemma: "  ", options: ["a", "b"] }));
    expect(res.status).toBe(400);
  });
  it("400 for fewer than 2 options", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    expect((await POST(req({ dilemma: "d", options: ["a"] }))).status).toBe(400);
  });
  it("400 for more than 4 options", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    expect((await POST(req({ dilemma: "d", options: ["a", "b", "c", "d", "e"] }))).status).toBe(400);
  });
  it("400 for blank options", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    expect((await POST(req({ dilemma: "d", options: ["a", " "] }))).status).toBe(400);
  });
  it("400 for duplicate options ignoring case", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    expect((await POST(req({ dilemma: "d", options: ["Stay", " stay "] }))).status).toBe(400);
  });
  it("400 for a malformed body", async () => {
    vi.stubEnv("GEMINI_API_KEY", "k");
    const res = await POST(new Request("http://localhost/api/fight", { method: "POST", body: "nope" }));
    expect(res.status).toBe(400);
  });
});

describe("POST /api/fight config", () => {
  it("500 with a clear message when GEMINI_API_KEY is unset", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const res = await POST(req({ dilemma: "d", options: ["a", "b"] }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toMatch(/GEMINI_API_KEY/);
  });
});

