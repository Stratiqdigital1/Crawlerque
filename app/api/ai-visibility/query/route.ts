// app/api/ai-visibility/query/route.ts  (UPDATED — now logs WHY a model fails)
import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You are a helpful assistant. Answer the following question naturally. " +
  "Do not add disclaimers. Be specific and mention real brand names where relevant.";

// ── Model names — if the terminal logs "model not found", change these ──
const OPENAI_MODEL = "gpt-4o-mini";
const ANTHROPIC_MODEL = "claude-3-5-haiku-20241022";
const GEMINI_MODEL = "gemini-1.5-flash"; // if Gemini errors, try "gemini-2.0-flash"

export async function queryOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 600,
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 250)}`);
  const json = await res.json();
  return json?.choices?.[0]?.message?.content?.trim() || "";
}

export async function queryAnthropic(prompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("Missing ANTHROPIC_API_KEY");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 250)}`);
  const json = await res.json();
  return (json?.content?.map((b: any) => b?.text || "").join(" ") || "").trim();
}

export async function queryGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Missing GEMINI_API_KEY");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 250)}`);
  const json = await res.json();
  return (
    json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join(" ") || ""
  ).trim();
}

export const AI_MODELS = [
  { name: "ChatGPT", fn: queryOpenAI },
  { name: "Claude", fn: queryAnthropic },
  { name: "Gemini", fn: queryGemini },
];

export async function queryAllModels(prompt: string) {
  const settled = await Promise.allSettled(AI_MODELS.map((m) => m.fn(prompt)));
  return AI_MODELS.map((m, i) => {
    const r = settled[i];
    if (r.status === "rejected") {
      // 👇 This prints the exact reason in your terminal so you can see why a model failed.
      console.error(`[ai-visibility] ${m.name} failed:`, r.reason?.message || r.reason);
    }
    return {
      model: m.name,
      response: r.status === "fulfilled" ? r.value : "",
      error: r.status === "rejected" ? r.reason?.message || "failed" : null,
    };
  });
}

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ success: false, error: "prompt required" }, { status: 400 });
    }
    const results = await queryAllModels(prompt);
    return NextResponse.json({ success: true, results });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || "failed" }, { status: 500 });
  }
}