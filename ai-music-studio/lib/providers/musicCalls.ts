import "server-only";

// 공용 기준 코드 `music-sync-calls` (2026-10-23 등록, 기준 = 이 파일). 사본: shots/src/lib/ai/musicCalls.ts
// 요청 안에서 바로 음원을 돌려주는 공급자(Google Lyria·ElevenLabs Music) 호출과 오류 안내만 담는다 —
// 모델 목록·저장·화면·회원 키 조회는 각 프로그램이 한다. 사본은 직접 고치지 말고 이 파일을 고친 뒤
// `node scripts/check-shared-modules.mjs --sync`. 유료 생성이므로 자동 재시도하지 않는다(이중 과금 방지).

const LYRIA_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const ELEVENLABS_ENDPOINT = "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_192";
const TIMEOUT_MS = 240_000;

/** 공급자 오류를 회원이 알아볼 수 있는 한국어 문장으로 바꾼다(원문은 짧게 뒤에 남김, 키 값은 넣지 않음) */
export function musicProviderError(providerName: string, status: number, body: string): Error {
  const hint =
    status === 401 || status === 403
      ? " API 키를 확인해 주세요(API키등록·플랫폼연동)."
      : status === 402
        ? " 크레딧·결제 등록이 필요합니다. 해당 플랫폼에서 충전해 주세요."
        : status === 429
          ? " 요청 한도에 걸렸거나 크레딧이 부족합니다. 잠시 뒤 다시 시도하거나 플랫폼에서 확인해 주세요."
          : status === 422 || status === 400
            ? " 입력값을 받아들이지 않았습니다(가사·설명 길이나 금지된 표현을 확인해 주세요)."
            : status >= 500
              ? " 플랫폼 서버 오류입니다. 잠시 뒤 다시 시도해 주세요."
              : "";
  const raw = body.replace(/\s+/g, " ").slice(0, 300);
  return new Error(`${providerName} 요청이 실패했습니다. (${status})${hint}${raw ? ` 원문: ${raw}` : ""}`);
}

interface Part {
  type?: string;
  text?: string;
  data?: string;
  mime_type?: string;
  mimeType?: string;
}

/** 응답 모양이 조금 달라도 audio·text 조각을 모두 찾는다(steps[].content[], output_audio 등) */
function collectParts(node: unknown, out: Part[] = []): Part[] {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const n of node) collectParts(n, out);
    return out;
  }
  const obj = node as Record<string, unknown>;
  if ((obj.type === "audio" && typeof obj.data === "string") || (obj.type === "text" && typeof obj.text === "string")) {
    out.push(obj as Part);
    return out;
  }
  for (const v of Object.values(obj)) collectParts(v, out);
  return out;
}

export interface LyriaRequest {
  model: string;
  /** 설명 문장 하나, 또는 텍스트+이미지 묶음([{type:"text",text},{type:"image",mime_type,data}]) */
  input: string | Record<string, unknown>[];
  wav?: boolean;
}

/**
 * Google Lyria (Gemini API interactions) — 2026-10-23 공식 문서(ai.google.dev/gemini-api/docs/music-generation) 기준.
 * POST /v1beta/interactions { model, input, response_format:{type:"audio"} } → steps[].content[]에 audio(base64)·text(가사).
 */
export async function callLyria(req: LyriaRequest, apiKey: string): Promise<{ data: Uint8Array; contentType: string; text?: string }> {
  const res = await fetch(LYRIA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ model: req.model, input: req.input, response_format: req.wav ? { type: "audio", mime_type: "audio/wav" } : { type: "audio" } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw musicProviderError("Google Lyria", res.status, await res.text());
  const parts = collectParts(await res.json());
  const audio = parts.find((p) => p.type === "audio" && p.data);
  if (!audio?.data) throw new Error("Google Lyria가 음원을 돌려주지 않았습니다(안전 필터에 걸렸을 수 있습니다 — 아티스트 이름·저작권 가사를 빼고 다시 시도해 주세요).");
  const text = parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("\n")
    .trim();
  return {
    data: new Uint8Array(Buffer.from(audio.data, "base64")),
    contentType: audio.mime_type || audio.mimeType || (req.wav ? "audio/wav" : "audio/mpeg"),
    text: text || undefined,
  };
}

/**
 * ElevenLabs Eleven Music — 2026-10-23 공식 문서(elevenlabs.io/docs/api-reference/music/compose) 기준.
 * POST /v1/music?output_format=mp3_44100_192 — body는 { prompt, music_length_ms(3000~600000), model_id, force_instrumental }
 * 또는 { composition_plan, model_id } → 음원 바이트.
 */
export async function callElevenLabsMusic(body: Record<string, unknown>, apiKey: string): Promise<{ data: Uint8Array; contentType: string }> {
  const res = await fetch(ELEVENLABS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw musicProviderError("ElevenLabs Music", res.status, await res.text());
  const data = new Uint8Array(await res.arrayBuffer());
  if (data.byteLength < 1000) throw new Error("ElevenLabs Music가 빈 음원을 돌려주었습니다. 다시 시도해 주세요.");
  return { data, contentType: res.headers.get("content-type") || "audio/mpeg" };
}
