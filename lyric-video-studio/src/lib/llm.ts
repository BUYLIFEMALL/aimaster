import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { UserError } from "@/lib/errors";
import { buildYtMetaPrompt, parseYtMeta, type YtMeta, type YtMetaInput } from "@/lib/ytMeta";

// v1.14 유튜브 제목·설명 AI 제안 — 회원 본인 키만 쓴다(공용 user_api_keys, 다른 프로그램에서 등록한 키 그대로).
// 운영자·다른 회원 키로 대신하지 않고, 키가 없으면 등록 안내만 한다. 회원 키 이중 과금을 막으려고 다시 시도하지 않는다.
// 모델은 짧은 글 제안에 맞는 저가 모델(docs/AI_MODEL_CATALOG.md 저가 가성비 군) — 기본은 Claude.
type Provider = "anthropic" | "gemini" | "openai";
const ORDER: Provider[] = ["anthropic", "gemini", "openai"];
const MODEL: Record<Provider, string> = { anthropic: "claude-haiku-5-5", gemini: "gemini-3.5-flash-lite", openai: "gpt-6-luna" };
const LABEL: Record<Provider, string> = { anthropic: "Claude", gemini: "Gemini", openai: "OpenAI" };
const TIMEOUT_MS = 40_000;

async function ownKey(userId: string): Promise<{ provider: Provider; key: string } | null> {
  const { data, error } = await createAdminClient().from("user_api_keys").select("provider, api_key").eq("user_id", userId).in("provider", ORDER);
  if (error) throw new Error(`user_api_keys read failed: ${error.message}`);
  const rows = (data ?? []) as { provider: string; api_key: string | null }[];
  for (const p of ORDER) {
    const key = rows.find((r) => r.provider === p)?.api_key?.trim();
    if (key) return { provider: p, key };
  }
  return null;
}

async function call(provider: Provider, key: string, system: string, user: string): Promise<string> {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const post = async (url: string, headers: Record<string, string>, body: unknown) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body), signal, cache: "no-store" });
    const d = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    if (!r.ok) throw Object.assign(new Error(`${LABEL[provider]} ${r.status}`), { status: r.status });
    return d;
  };
  if (provider === "anthropic") {
    const d = await post("https://api.anthropic.com/v1/messages", { "x-api-key": key, "anthropic-version": "2023-06-01" }, { model: MODEL.anthropic, max_tokens: 1200, system, messages: [{ role: "user", content: user }] });
    return Array.isArray(d.content) ? (d.content as { text?: string }[]).map((c) => c.text ?? "").join("") : "";
  }
  if (provider === "gemini") {
    const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL.gemini}:generateContent`, { "x-goog-api-key": key }, { systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }], generationConfig: { responseMimeType: "application/json" } });
    const parts = (d.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined)?.[0]?.content?.parts;
    return (parts ?? []).map((p) => p.text ?? "").join("");
  }
  const d = await post("https://api.openai.com/v1/chat/completions", { Authorization: `Bearer ${key}` }, { model: MODEL.openai, messages: [{ role: "system", content: system }, { role: "user", content: user }], response_format: { type: "json_object" } });
  return String((d.choices as { message?: { content?: string } }[] | undefined)?.[0]?.message?.content ?? "");
}

/** 회원 본인 키로 제목 3개·설명·해시태그를 받는다(1회 호출, 다시 시도 없음) */
export async function suggestYtMeta(userId: string, input: YtMetaInput): Promise<YtMeta & { provider: string; model: string }> {
  const own = await ownKey(userId);
  if (!own) throw new UserError(400, "등록된 AI 키가 없습니다. 메인 사이트의 API키등록·플랫폼연동에서 본인 Claude(또는 Gemini·OpenAI) 키를 먼저 등록해 주세요.", { needKey: true });
  const name = LABEL[own.provider];
  const p = buildYtMetaPrompt(input);
  let text: string;
  try { text = await call(own.provider, own.key, p.system, p.user); }
  catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401 || status === 403) throw new UserError(400, `${name} API 키가 올바르지 않거나 권한이 없습니다. API키등록·플랫폼연동에서 키를 확인해 주세요.`, { needKey: true });
    if (status === 429 || status === 529) throw new UserError(429, `${name} 사용 한도를 넘었거나 요청이 몰렸습니다. 잠시 뒤 다시 눌러 주세요.`);
    if (e instanceof Error && e.name === "TimeoutError") throw new UserError(504, "AI 응답이 늦어 멈췄습니다. 잠시 뒤 다시 눌러 주세요.");
    console.error("[lyric-video-studio yt-meta]", status ?? (e instanceof Error ? e.name : "unknown"));
    throw new UserError(502, "AI 처리에 실패했습니다. 잠시 뒤 다시 눌러 주세요.");
  }
  const meta = parseYtMeta(text);
  if (!meta) throw new UserError(502, "AI 응답을 읽지 못했습니다. 다시 눌러 주세요.");
  return { ...meta, provider: name, model: MODEL[own.provider] };
}
