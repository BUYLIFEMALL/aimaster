import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { UserError } from "@/lib/errors";
import { GEMINI_TRANSCRIPT_PROMPT, cleanTranscript, isTranscribeModel, transcribeModelOf } from "@/lib/transcribeModels";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// v1.29 레퍼런스 쇼츠에서 대본 따기: 브라우저가 영상에서 뽑은 소리(모노 WAV, 공용 browser-video-extract)를
// 회원이 고른 받아쓰기 모델의 본인 키로 받아쓰기 → 글만 돌려준다(영상·소리는 저장하지 않음).
// v1.48(2026-11-10): 모델 선택 — Gemini 3.8 Flash(기본)·3.5 Flash Lite·OpenAI gpt-transcribe. 모델 값 없는 옛 화면은 whisper-1 그대로.
// 유료 호출이라 재시도하지 않는다. 고른 모델의 키가 없으면 다른 제공자로 바꾸지 않고 등록 안내.
const MAX_AUDIO_B64 = 3_000_000;
const NO_SPEECH = "영상에서 말소리를 찾지 못했습니다. 말하는 영상인지 확인해 주세요.";

async function viaGemini(key: string, model: string, data: string): Promise<string> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(90_000),
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ inline_data: { mime_type: "audio/wav", data } }, { text: GEMINI_TRANSCRIPT_PROMPT }] }],
      generationConfig: { temperature: 0 },
    }),
  });
  if (res.status === 401 || res.status === 403) throw new UserError(400, "Gemini API 키가 올바르지 않습니다. 설정에서 본인 키를 확인해 주세요.", { needKey: true, provider: "gemini" });
  if (res.status === 429) throw new UserError(429, "Gemini 사용 한도를 넘었습니다. 잠시 후 다시 시도하거나 다른 받아쓰기 모델을 골라 주세요.");
  if (!res.ok) throw new UserError(502, `받아쓰기에 실패했습니다(Gemini ${res.status}). 잠시 후 다시 시도해 주세요.`);
  const j = await res.json();
  return cleanTranscript((j.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join(""));
}

async function viaOpenAI(key: string, model: "gpt-transcribe" | "whisper-1", data: string): Promise<string> {
  const fd = new FormData();
  fd.append("file", new Blob([Buffer.from(data, "base64")], { type: "audio/wav" }), "reference.wav");
  fd.append("model", model);
  if (model === "whisper-1") { fd.append("response_format", "text"); fd.append("language", "ko"); }
  else fd.append("languages[]", "ko"); // gpt-transcribe: 단수 language 대신 languages[](공식 문서 2026-11-10)
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: fd, cache: "no-store", signal: AbortSignal.timeout(90_000) });
  if (res.status === 401 || res.status === 403) throw new UserError(400, "OpenAI API 키가 올바르지 않습니다. 설정에서 본인 키를 확인해 주세요.", { needKey: true, provider: "openai" });
  if (res.status === 429) throw new UserError(429, "OpenAI 사용 한도나 잔액을 초과했습니다. OpenAI 계정을 확인하거나 다른 받아쓰기 모델을 골라 주세요.");
  if (!res.ok) throw new UserError(502, `받아쓰기에 실패했습니다(${res.status}). 잠시 후 다시 시도해 주세요.`);
  if (model === "whisper-1") return (await res.text()).trim().slice(0, 8000);
  return cleanTranscript(((await res.json()) as { text?: string }).text);
}

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 3_200_000); if (g instanceof NextResponse) return g;
    const audio = g.body.audio && typeof g.body.audio === "object" ? (g.body.audio as Record<string, unknown>) : null;
    const data = typeof audio?.data === "string" ? audio.data : "";
    if (audio?.mimeType !== "audio/wav" || !data || data.length > MAX_AUDIO_B64 || !/^[A-Za-z0-9+/=]+$/.test(data)) {
      throw new UserError(400, "영상의 소리를 읽지 못했습니다. 다른 영상 파일로 다시 시도해 주세요.");
    }
    const model = isTranscribeModel(g.body.model) ? g.body.model : null;
    const provider = model ? transcribeModelOf(model).provider : "openai";
    const key = (await getUserApiKeys(g.userId, [provider]))[provider];
    if (!key) {
      const name = model ? transcribeModelOf(model).name : "OpenAI Whisper";
      throw new UserError(400, `${name} 받아쓰기는 본인 ${provider === "gemini" ? "Gemini" : "OpenAI"} 키가 필요합니다. 설정에서 등록하거나 다른 받아쓰기 모델을 골라 주세요.`, { needKey: true, provider });
    }
    const transcript = provider === "gemini" ? await viaGemini(key, model!, data) : await viaOpenAI(key, model === "gpt-transcribe" ? "gpt-transcribe" : "whisper-1", data);
    if (!transcript) throw new UserError(422, NO_SPEECH);
    return json({ transcript, model: model ?? "whisper-1" });
  } catch (e) { return fail(e); }
}
