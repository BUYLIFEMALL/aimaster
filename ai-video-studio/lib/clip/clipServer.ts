import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/generations";
import { getUserApiKey } from "@/lib/access";
import { parsePicks, pickPrompt, type Pick, type Seg } from "@/lib/clip/clipPlan";

// v1.27(V1) 긴 영상 → 쇼츠 서버 쪽. 영상은 받지 않고, 브라우저가 뽑은 소리(16kHz 모노 WAV)만 회원 폴더에 잠깐 올렸다가 받아쓰기 직후 지운다.
// 회원 본인 키만 쓴다(최상위 규칙). 유료 호출은 자동 재시도하지 않는다(이중 과금 방지).

export class ClipError extends Error {
  constructor(public status: number, message: string, public needKey = false) { super(message); }
}

/** Whisper 파일 한도 25MB — 16kHz 모노 16비트 10분 ≈ 19.2MB */
export const MAX_WAV_BYTES = 24 * 1024 * 1024;

const clipDir = (userId: string) => `${userId}/clip/`;

/** 소리 파일 일회용 업로드 주소 */
export async function createAudioUpload(userId: string): Promise<{ path: string; token: string }> {
  const path = `${clipDir(userId)}${randomUUID()}.wav`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new ClipError(500, "업로드 주소를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
  return { path, token: data.token };
}

/** 받아쓰기: 회원 본인 OpenAI 키로 whisper-1(문장 시각 포함). 끝나면 성공·실패와 상관없이 소리 파일을 지운다 */
export async function transcribeAudio(userId: string, path: string): Promise<{ duration: number; segments: Seg[] }> {
  if (typeof path !== "string" || !path.startsWith(clipDir(userId)) || !/^[\w-]+\/clip\/[\w-]+\.wav$/.test(path)) {
    throw new ClipError(400, "소리 파일 경로가 올바르지 않습니다.");
  }
  const admin = createAdminClient();
  try {
    const key = await getUserApiKey(userId, "openai");
    if (!key) throw new ClipError(400, "받아쓰기는 본인 OpenAI 키가 필요합니다. API키등록·플랫폼연동에서 등록해 주세요.", true);
    const { data: file, error } = await admin.storage.from(BUCKET).download(path);
    if (error || !file) throw new ClipError(400, "올린 소리 파일을 찾지 못했습니다. 다시 시도해 주세요.");
    if (file.size > MAX_WAV_BYTES) throw new ClipError(400, "영상이 너무 깁니다. 10분 이하 영상을 넣어 주세요.");
    const fd = new FormData();
    fd.append("file", file, "audio.wav");
    fd.append("model", "whisper-1");
    fd.append("language", "ko");
    fd.append("response_format", "verbose_json");
    fd.append("timestamp_granularities[]", "segment");
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd, cache: "no-store", signal: AbortSignal.timeout(240_000),
    }).catch(() => null);
    if (!res) throw new ClipError(504, "받아쓰기가 늦어지고 있습니다. 잠시 뒤 다시 시도해 주세요.");
    if (res.status === 401 || res.status === 403) throw new ClipError(400, "OpenAI API 키가 올바르지 않습니다. 본인 키를 확인해 주세요.", true);
    if (res.status === 429) throw new ClipError(429, "OpenAI 사용 한도나 잔액을 초과했습니다. OpenAI 계정을 확인해 주세요.");
    if (!res.ok) throw new ClipError(502, `받아쓰기에 실패했습니다(${res.status}). 잠시 뒤 다시 시도해 주세요.`);
    const j = (await res.json()) as { duration?: number; segments?: { start: number; end: number; text: string }[] };
    const segments = (j.segments ?? []).map((s) => ({ start: Number(s.start), end: Number(s.end), text: String(s.text ?? "") }));
    if (!segments.some((s) => s.text.trim())) throw new ClipError(422, "영상에서 말소리를 찾지 못했습니다. 말하는 영상인지 확인해 주세요.");
    return { duration: Number(j.duration) || 0, segments };
  } finally {
    await admin.storage.from(BUCKET).remove([path]).catch(() => undefined);
  }
}

// 구간 고르기에 쓰는 회원 키 순서(기본 AI = Claude, 없으면 회원이 가진 다른 키) — 모두 저가 모델
const PICK_MODELS = [
  { provider: "anthropic", model: "claude-haiku-4-5" },
  { provider: "gemini", model: "gemini-3.5-flash-lite" },
  { provider: "openai", model: "gpt-4o-mini" },
] as const;

function jsonOf(text: string): unknown {
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  try { return a >= 0 && b > a ? JSON.parse(text.slice(a, b + 1)) : null; } catch { return null; }
}

/** AI 구간 고르기 1회(재시도 없음). 문장 번호로 받아 코드가 15~45초로 고친다 */
export async function pickClips(userId: string, segs: Seg[]): Promise<{ picks: Pick[]; model: string }> {
  let chosen: { provider: string; model: string; key: string } | null = null;
  for (const m of PICK_MODELS) {
    const key = await getUserApiKey(userId, m.provider);
    if (key) { chosen = { ...m, key }; break; }
  }
  if (!chosen) throw new ClipError(400, "구간 고르기에는 본인 Claude·Gemini·OpenAI 키 중 하나가 필요합니다. API키등록·플랫폼연동에서 등록해 주세요.", true);
  const { system, prompt } = pickPrompt(segs);
  const opts = { method: "POST", cache: "no-store" as const, signal: AbortSignal.timeout(60_000) };
  let text = "";
  let res: Response | null = null;
  if (chosen.provider === "anthropic") {
    res = await fetch("https://api.anthropic.com/v1/messages", { ...opts, headers: { "x-api-key": chosen.key, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: chosen.model, max_tokens: 1500, system, messages: [{ role: "user", content: prompt }] }) }).catch(() => null);
    if (res?.ok) text = ((await res.json()).content ?? []).map((c: { text?: string }) => c.text ?? "").join("");
  } else if (chosen.provider === "gemini") {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${chosen.model}:generateContent`, { ...opts, headers: { "x-goog-api-key": chosen.key, "content-type": "application/json" }, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }) }).catch(() => null);
    if (res?.ok) text = ((await res.json()).candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
  } else {
    res = await fetch("https://api.openai.com/v1/chat/completions", { ...opts, headers: { Authorization: `Bearer ${chosen.key}`, "content-type": "application/json" }, body: JSON.stringify({ model: chosen.model, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: prompt }] }) }).catch(() => null);
    if (res?.ok) text = (await res.json()).choices?.[0]?.message?.content ?? "";
  }
  if (!res) throw new ClipError(504, "구간 고르기가 늦어지고 있습니다. 잠시 뒤 다시 눌러 주세요.");
  if (res.status === 401 || res.status === 403 || res.status === 400) throw new ClipError(400, `${chosen.provider} 키를 확인해 주세요(키가 틀렸거나 사용이 막혀 있습니다).`, true);
  if (res.status === 429) throw new ClipError(429, "AI 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도해 주세요.");
  if (!res.ok) throw new ClipError(502, "AI가 응답하지 않았습니다. 잠시 뒤 다시 시도해 주세요.");
  const picks = parsePicks(jsonOf(text), segs);
  if (!picks.length) throw new ClipError(502, "AI가 구간을 고르지 못했습니다. 다시 눌러 주시거나 직접 구간을 골라 주세요.");
  return { picks, model: chosen.model };
}

/** 화면에서 보낸 문장 목록 검사 */
export function readSegs(raw: unknown): Seg[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 400).map((s) => ({
    start: Number((s as Seg)?.start), end: Number((s as Seg)?.end), text: String((s as Seg)?.text ?? "").slice(0, 400),
  })).filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start && s.text.trim());
}
