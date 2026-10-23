import "server-only";
import { GoogleGenAI } from "@google/genai";
import type { Analysis, MediaType, ModelLevel, Options } from "@/lib/rpa/types";
import { analysisPrompt, SYSTEM_INSTRUCTION } from "@/lib/rpa/prompts";
import { normalize, parseJsonLoose, responseSchema } from "@/lib/rpa/schemas";

// 모델명은 자주 바뀌므로 한곳에서 관리한다. 앞 모델을 쓸 수 없으면 다음 모델로 자동 폴백한다.
export const MODEL_CHAIN: Record<ModelLevel, string[]> = {
  flash: ["gemini-3.5-flash", "gemini-2.5-flash"],
  pro: ["gemini-3.1-pro-preview", "gemini-3.5-flash", "gemini-2.5-flash"],
};

export type AiErrorCode = "key" | "quota" | "timeout" | "parse" | "safety" | "media" | "unknown";
export class AiError extends Error {
  constructor(public code: AiErrorCode, message = "") { super(message); }
}

/** 어떤 예외든 사용자에게 보여줄 한국어 메시지와 HTTP 상태로 바꾼다(키 값은 절대 포함하지 않는다) */
export function toUserError(e: unknown): { code: AiErrorCode; message: string; status: number } {
  const table: Record<AiErrorCode, { message: string; status: number }> = {
    key: { message: "등록한 Gemini API 키가 올바르지 않거나 이 기능을 쓸 권한이 없습니다. [API키등록·플랫폼연동]에서 키를 확인해 주세요.", status: 400 },
    quota: { message: "Gemini 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 본인 Google 계정의 한도를 확인해 주세요.", status: 429 },
    timeout: { message: "AI 응답이 늦어 중단되었습니다. 파일이 길거나 크면 더 짧게 잘라 다시 시도해 주세요.", status: 504 },
    parse: { message: "AI가 올바른 형식으로 응답하지 못했습니다. 다시 시도해 주세요.", status: 502 },
    safety: { message: "AI 안전 정책으로 이 파일을 분석하지 못했습니다. 다른 파일로 시도해 주세요.", status: 422 },
    media: { message: "파일을 처리하지 못했습니다. 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다. 다른 형식(예: MP4, MP3, JPG)으로 변환해 다시 올려 주세요.", status: 422 },
    unknown: { message: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", status: 500 },
  };
  if (e instanceof AiError) return { code: e.code, ...table[e.code] };
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  if (/api key|api_key|permission|unauthenticated|\b401\b|\b403\b/.test(raw)) return { code: "key", ...table.key };
  if (/quota|resource_exhausted|\b429\b|rate/.test(raw)) return { code: "quota", ...table.quota };
  if (/timeout|deadline|\b503\b|\b504\b|unavailable|abort/.test(raw)) return { code: "timeout", ...table.timeout };
  if (/invalid argument|unsupported|mime|could not process|failed to process|\b400\b/.test(raw)) return { code: "media", ...table.media };
  return { code: "unknown", ...table.unknown };
}

function isModelUnavailable(e: unknown): boolean {
  const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
  return /not found|\b404\b|is not supported|unsupported model|does not exist/.test(raw);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface AnalyzeInput { media: MediaType; mime: string; bytes: Buffer; options: Options }
export interface AnalyzeOutput { result: Analysis; modelUsed: string }

/** Files API에 올리고 처리가 끝날 때까지 기다린다(동영상·오디오). 최대 약 4분. */
async function uploadAndWait(ai: GoogleGenAI, bytes: Buffer, mime: string): Promise<{ name: string; uri: string; mimeType: string }> {
  const file = await ai.files.upload({ file: new Blob([new Uint8Array(bytes)], { type: mime }), config: { mimeType: mime } });
  if (!file.name) throw new AiError("media");
  let cur = file;
  const deadline = Date.now() + 240_000;
  while (cur.state === "PROCESSING") {
    if (Date.now() > deadline) throw new AiError("timeout");
    await sleep(3000);
    cur = await ai.files.get({ name: file.name });
  }
  if (cur.state === "FAILED" || !cur.uri) throw new AiError("media");
  return { name: file.name, uri: cur.uri, mimeType: cur.mimeType ?? mime };
}

/**
 * 파일 하나를 분석한다. 이미지는 인라인, 동영상·오디오는 Files API로 올린 뒤 분석하고
 * Files API에 올린 사본은 끝나면 반드시 지운다. JSON 형식이 어긋나면 한 번 더 시도한다.
 */
export async function analyze(apiKey: string, input: AnalyzeInput): Promise<AnalyzeOutput> {
  const ai = new GoogleGenAI({ apiKey });
  let remote: { name: string; uri: string; mimeType: string } | null = null;
  try {
    const filePart = input.media === "image"
      ? { inlineData: { mimeType: input.mime, data: input.bytes.toString("base64") } }
      : await uploadAndWait(ai, input.bytes, input.mime).then((f) => { remote = f; return { fileData: { fileUri: f.uri, mimeType: f.mimeType } }; });

    const contents = [{ role: "user", parts: [filePart, { text: analysisPrompt(input.media, input.options) }] }];
    let last: unknown;
    for (const model of MODEL_CHAIN[input.options.model]) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              temperature: 0.4,
              responseMimeType: "application/json",
              responseSchema: responseSchema(input.media),
              maxOutputTokens: 8192,
            },
          });
          if (res.promptFeedback?.blockReason) throw new AiError("safety");
          const result = normalize(input.media, parseJsonLoose(res.text), input.options.target);
          if (result) return { result, modelUsed: model };
          const reason = res.candidates?.[0]?.finishReason;
          last = new AiError(reason === "SAFETY" || reason === "PROHIBITED_CONTENT" ? "safety" : "parse");
          if (last instanceof AiError && last.code === "safety") throw last;
        } catch (e) {
          last = e;
          if (e instanceof AiError && e.code === "safety") throw e;
          if (isModelUnavailable(e)) break; // 다음 모델로
          if (!(e instanceof AiError)) throw e;
        }
      }
    }
    throw last ?? new AiError("unknown");
  } finally {
    const r = remote as { name: string } | null;
    if (r) await ai.files.delete({ name: r.name }).catch(() => {});
  }
}
