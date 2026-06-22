// app/api/ai-visibility/query/route.ts  (UPDATED — now logs WHY a model fails)
import { NextResponse } from "next/server";

const SYSTEM_PROMPT =
  "You are a helpful assistant. Answer the following question naturally. " +
  "Do not add disclaimers. Be specific and mention real brand names where relevant.";

// ── Model names — if the terminal logs "model not found", change these ──
const OPENAI_MODEL = "gpt-4o-mini";
const ANTHROPIC_MODEL = "claude-haiku-4-5";
const GEMINI_MODEL = "gemini-2.5-flash";

// ── DataForSEO LLM Responses (web_search built-in) ─────────────────────
function dfsAuthHeader() {
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) return null;
  return "Basic " + Buffer.from(`${login}:${password}`).toString("base64");
}

function extractDfsText(json: any): string {
  try {
    const r = json?.tasks?.[0]?.result?.[0];
    const item = r?.items?.[0] || r || {};
    const text =
      item?.sections?.map((s: any) => s?.text).filter(Boolean).join("\n") ||
      item?.text || item?.content || item?.message ||
      item?.choices?.[0]?.message?.content || "";
    return typeof text === "string" ? text.trim() : "";
  } catch {
    return "";
  }
}

async function dfsLlmResponse(
  endpoint: string,
  modelName: string,
  prompt: string,
  forceWebSearch: boolean,
  countryIso = "US"
): Promise<string> {
  const auth = dfsAuthHeader();
  if (!auth) throw new Error("Missing DATAFORSEO_LOGIN or DATAFORSEO_PASSWORD");

  const payload: any = {
    user_prompt: String(prompt || "").slice(0, 500),
    model_name: modelName,
    system_message: SYSTEM_PROMPT.slice(0, 500),
    web_search: true,
    web_search_country_iso_code: countryIso,
    max_output_tokens: 400,
    temperature: 0.4,
  };
  if (forceWebSearch) payload.force_web_search = true;

  const res = await fetch(`https://api.dataforseo.com/v3/${endpoint}`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify([payload]),
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`DataForSEO ${res.status}: ${(await res.text()).slice(0, 250)}`);
  const json = await res.json();
  const task = json?.tasks?.[0];
  if (task?.status_code && task.status_code !== 20000) {
    throw new Error(`DataForSEO task ${task.status_code}: ${task.status_message}`);
  }
  return extractDfsText(json);
}

export async function dfsChatGPT(prompt: string, countryIso = "US") {
  return dfsLlmResponse("ai_optimization/chat_gpt/llm_responses/live", "gpt-4o-mini", prompt, true, countryIso);
}
export async function dfsClaude(prompt: string, countryIso = "US") {
  return dfsLlmResponse("ai_optimization/claude/llm_responses/live", "claude-sonnet-4-0", prompt, true, countryIso);
}
export async function dfsGemini(prompt: string, countryIso = "US") {
  return dfsLlmResponse("ai_optimization/gemini/llm_responses/live", "gemini-2.5-flash", prompt, false, countryIso);
}

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
      max_tokens: 300,
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
      max_tokens: 300,
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
        generationConfig: { temperature: 0.7, maxOutputTokens: 300 },
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

// Har model call ko max 8s do — koi slow/hung model audit ko block na kare.
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

export async function queryAllModels(prompt: string, countryIso = "US") {
  const settled = await Promise.allSettled(AI_MODELS.map((m) => withTimeout(m.fn(prompt, countryIso), 90000)));
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