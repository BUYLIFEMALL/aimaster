/**
 * Gemini(나노바나나) 이미지 생성 호출 공용 기준 코드 — 엔드포인트 호출·대기·생성된 이미지 받아오기 (2026-10-17).
 *
 * ⚠️ 공용 기준 코드(docs/SHARED_MODULES.md, 모듈 id: gemini-image-client).
 *   - 기준(여기만 고친다): ai-image-studio/lib/providers/geminiImage.ts
 *   - 사본(직접 고치지 않는다): docs/SHARED_MODULES.md §3 표와 scripts/check-shared-modules.mjs 목록 참고
 *   기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영하고, 사본을 쓰는 프로그램도 테스트·빌드·배포·버전 +0.01.
 *
 * 범위(주인님 지시): 호출·대기·이미지 받아오기만. 프롬프트·모델 이름·화질·비율·생성 온도는 각 프로그램이 정해 넘긴다
 *   (프로그램마다 생성 스타일이 다르므로 여기서 바꾸지 않는다 — docs/IMAGE_PROMPT_RULES.md §0).
 * 안정성 장치: ① 키를 주소가 아니라 요청 머리글(x-goog-api-key)로 보내 서버 기록에 남지 않게 ② 시간 제한(기본 120초)
 *   ③ 서버 오류·일시적 혼잡(429)·네트워크 연결 실패에만 1회 재시도(키·한도·요청·안전 차단은 재시도 안 함). 시간 초과는 이미 생성·과금됐을 수 있어 재시도하지 않음(2026-10-17)
 *   ④ 응답의 모든 조각(parts)에서 이미지를 찾음 ⑤ 안전 필터 차단·이미지 없음·한도 소진·키 오류를 구분한 한국어 안내 ⑥ 키 가리기.
 * 프로그램 고유 코드(server-only, 회원 키 읽기, 저장소 업로드, 화면 문구)는 여기에 넣지 않는다.
 */

export const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiImageErrorCode =
  | "QUOTA_EXCEEDED"
  | "RATE_LIMITED"
  | "INVALID_KEY"
  | "API_NOT_ENABLED"
  | "PERMISSION_DENIED"
  | "MODEL_NOT_FOUND"
  | "BAD_REQUEST"
  | "SAFETY_BLOCKED"
  | "NO_IMAGE"
  | "TIMEOUT"
  | "NETWORK"
  | "SERVER_ERROR"
  | "CANCELLED"
  | "UNKNOWN";

export class GeminiImageError extends Error {
  readonly code: GeminiImageErrorCode;
  readonly status: number;
  /** 회원이 키를 바꾸거나 설정해야 하는 오류 */
  readonly keyProblem: boolean;
  constructor(message: string, code: GeminiImageErrorCode, status: number) {
    super(message);
    this.name = "GeminiImageError";
    this.code = code;
    this.status = status;
    this.keyProblem = code === "INVALID_KEY" || code === "API_NOT_ENABLED" || code === "PERMISSION_DENIED";
  }
}

/** 오류 문구·로그에 키가 섞이지 않게 가린다. */
export function maskGeminiKey(text: string): string {
  return String(text ?? "")
    .replace(/([?&]key=)[^&\s"']+/gi, "$1***")
    .replace(/AIza[0-9A-Za-z_-]{20,}/g, "AIza***");
}

interface GeminiErrorBody {
  error?: { code?: number; status?: string; message?: string; details?: { reason?: string }[] };
}

/** Gemini 오류 응답을 회원이 이해할 수 있는 한국어 오류로 바꾼다(순수 함수). */
export function toGeminiImageError(status: number, body: unknown, modelName = ""): GeminiImageError {
  const err = (body as GeminiErrorBody | null)?.error;
  const st = err?.status ?? "";
  const reason = err?.details?.find((d) => d?.reason)?.reason ?? "";
  const raw = maskGeminiKey(err?.message ?? "");
  const lower = raw.toLowerCase();

  if (reason === "API_KEY_INVALID" || lower.includes("api key not valid") || lower.includes("api_key_invalid")) {
    return new GeminiImageError("Gemini API 키가 올바르지 않습니다. [API키등록·플랫폼연동]에서 본인 키를 다시 확인해 주세요.", "INVALID_KEY", 401);
  }
  if (reason === "SERVICE_DISABLED" || lower.includes("has not been used in project") || lower.includes("is disabled")) {
    return new GeminiImageError("이 키의 Google Cloud 프로젝트에서 Gemini API(Generative Language API)가 사용 설정되지 않았습니다. 콘솔에서 사용 설정해 주세요.", "API_NOT_ENABLED", 403);
  }
  if (status === 429 || st === "RESOURCE_EXHAUSTED") {
    const daily = lower.includes("quota") && (lower.includes("per day") || lower.includes("daily") || lower.includes("billing") || lower.includes("free_tier") || lower.includes("limit: 0"));
    return daily
      ? new GeminiImageError("본인 Gemini API 사용 한도(또는 결제 설정)에 걸렸습니다. Google AI Studio에서 결제·한도를 확인하거나 잠시 뒤 다시 시도해 주세요. 이미지 모델은 무료 사용량이 없을 수 있습니다.", "QUOTA_EXCEEDED", 429)
      : new GeminiImageError("이미지 생성 요청이 짧은 시간에 너무 많았습니다. 1~2분 뒤 다시 시도해 주세요.", "RATE_LIMITED", 429);
  }
  if (status === 403 || st === "PERMISSION_DENIED") {
    return new GeminiImageError("이 Gemini 키로 이미지 모델을 사용할 권한이 없습니다. 키의 사용 제한(웹사이트·IP)과 결제 설정을 확인해 주세요.", "PERMISSION_DENIED", 403);
  }
  if (status === 404 || st === "NOT_FOUND") {
    return new GeminiImageError(`이미지 모델(${modelName || "알 수 없음"})을 찾을 수 없습니다. 모델이 종료됐을 수 있어 관리자 확인이 필요합니다.`, "MODEL_NOT_FOUND", 404);
  }
  if (status === 400 || st === "INVALID_ARGUMENT" || st === "FAILED_PRECONDITION") {
    return new GeminiImageError(raw ? `이미지 생성 요청이 거절되었습니다: ${raw.slice(0, 200)}` : "이미지 생성 요청 형식이 올바르지 않습니다.", "BAD_REQUEST", 400);
  }
  if (status >= 500) {
    return new GeminiImageError("Gemini 이미지 서버가 일시적으로 응답하지 않습니다. 잠시 뒤 다시 시도해 주세요.", "SERVER_ERROR", 502);
  }
  return new GeminiImageError(raw ? `이미지 생성에 실패했습니다: ${raw.slice(0, 200)}` : `이미지 생성에 실패했습니다. (${status})`, "UNKNOWN", status || 500);
}

export interface GeminiImagePart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
  /** true면 모델이 생각하는 중에 만든 중간 초안(최종 결과 아님) — gemini-3-pro-image 등 */
  thought?: boolean;
}

export interface GeminiImageRequest {
  apiKey: string;
  /** 실제 모델 이름(예: gemini-nano-banana-2.1) — 각 프로그램 설정에서 정한 값 */
  modelName: string;
  /** 프롬프트 글(각 프로그램 고유). parts를 주면 parts가 우선 */
  prompt?: string;
  /** 참고 이미지 등 여러 조각을 직접 보낼 때 */
  parts?: GeminiImagePart[];
  /** 각 프로그램이 쓰던 생성 설정 그대로 */
  aspectRatio?: string;
  imageSize?: string;
  temperature?: number;
  /** 기본 ["IMAGE"]. 프로그램이 원래 쓰던 값(예: ["TEXT","IMAGE"])이 있으면 그대로 */
  responseModalities?: string[];
  /** 예전 사용자 지정 주소가 있으면(없으면 공식 주소) */
  endpoint?: string;
  /** 시간 제한(ms), 기본 120초 */
  timeoutMs?: number;
  /** 일시 오류(서버 오류·혼잡·연결 실패) 재시도 횟수, 기본 1. 시간 초과는 재시도하지 않음 */
  retries?: number;
  /** 요청이 끊기거나 사용자가 취소할 때의 외부 신호(선택, 예: 요청의 signal). 취소되면 재시도하지 않고 CANCELLED */
  signal?: AbortSignal;
  /** 테스트용 */
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export interface GeminiImageResult {
  base64: string;
  mimeType: string;
  modelName: string;
  /** 모델이 이미지와 함께 돌려준 글(있으면, 생각 중 글 제외) */
  text?: string;
  /** Gemini 사용량 정보(usageMetadata, 있으면) */
  usage?: unknown;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** 시간 제한 신호와 외부 취소 신호를 합친다(AbortSignal.any가 없는 환경도 지원). */
function combineSignals(timeoutMs: number, external?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs);
  if (!external) return timeout;
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any;
  if (anyFn) return anyFn([timeout, external]);
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (timeout.aborted || external.aborted) ctrl.abort();
  timeout.addEventListener("abort", abort, { once: true });
  external.addEventListener("abort", abort, { once: true });
  return ctrl.signal;
}

const cancelled = () => new GeminiImageError("이미지 생성을 취소했습니다.", "CANCELLED", 499);

interface GeminiResponse {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: GeminiImagePart[] } }[];
  usageMetadata?: unknown;
}

/**
 * 응답에서 이미지를 꺼낸다. 이미지가 없으면 이유(안전 차단 등)를 담은 오류를 던진다(순수 함수).
 * 2026-10-17 보완: 생각 중 중간 초안(thought: true)은 건너뛰고 최종 이미지(마지막 비-생각 이미지)를 고른다.
 */
export function extractGeminiImage(data: unknown, modelName = ""): GeminiImageResult {
  const res = (data ?? {}) as GeminiResponse;
  const block = res.promptFeedback?.blockReason;
  if (block) {
    throw new GeminiImageError(`프롬프트가 Gemini 안전 정책에 걸려 이미지를 만들지 않았습니다(${block}). 표현을 바꿔 다시 시도해 주세요.`, "SAFETY_BLOCKED", 422);
  }
  for (const cand of res.candidates ?? []) {
    const finals = (cand.content?.parts ?? []).filter((p) => p?.inlineData?.data && p.thought !== true);
    const part = finals[finals.length - 1];
    if (part?.inlineData?.data) {
      const text = (cand.content?.parts ?? []).filter((p) => p.thought !== true).map((p) => p.text ?? "").join("").trim();
      return {
        base64: part.inlineData.data.replace(/\s+/g, ""),
        mimeType: part.inlineData.mimeType || "image/png",
        modelName,
        ...(text ? { text } : {}),
        ...(res.usageMetadata ? { usage: res.usageMetadata } : {}),
      };
    }
  }
  const finish = res.candidates?.[0]?.finishReason ?? "";
  if (/SAFETY|PROHIBITED|BLOCKLIST|SPII|IMAGE_SAFETY|RECITATION/i.test(finish)) {
    throw new GeminiImageError(`생성 결과가 Gemini 안전 정책에 걸려 이미지가 나오지 않았습니다(${finish}). 표현을 바꿔 다시 시도해 주세요.`, "SAFETY_BLOCKED", 422);
  }
  throw new GeminiImageError(`이미지 모델(${modelName || "알 수 없음"})이 이미지를 돌려주지 않았습니다${finish ? `(${finish})` : ""}. 다시 시도해 주세요.`, "NO_IMAGE", 502);
}

/** Gemini 이미지 생성 1회. 성공하면 base64 이미지, 실패하면 GeminiImageError. */
export async function generateGeminiImage(req: GeminiImageRequest): Promise<GeminiImageResult> {
  const { apiKey, modelName, timeoutMs = 120_000, retries = 1, fetchImpl = fetch, sleep = defaultSleep, signal: external } = req;
  if (!apiKey) throw new GeminiImageError("Gemini API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 등록해 주세요.", "INVALID_KEY", 400);
  const url = req.endpoint || `${GEMINI_API_BASE}/${modelName}:generateContent`;
  const imageConfig: Record<string, string> = {};
  if (req.aspectRatio) imageConfig.aspectRatio = req.aspectRatio;
  if (req.imageSize) imageConfig.imageSize = req.imageSize;
  const generationConfig: Record<string, unknown> = { responseModalities: req.responseModalities ?? ["IMAGE"] };
  if (Object.keys(imageConfig).length) generationConfig.imageConfig = imageConfig;
  if (typeof req.temperature === "number") generationConfig.temperature = req.temperature;
  const body = JSON.stringify({
    contents: [{ role: "user", parts: req.parts?.length ? req.parts : [{ text: req.prompt ?? "" }] }],
    generationConfig,
  });

  let lastError: GeminiImageError | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (external?.aborted) throw cancelled();
    if (attempt > 0) await sleep(1500 * attempt);
    if (external?.aborted) throw cancelled();
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body,
        cache: "no-store",
        signal: combineSignals(timeoutMs, external),
      });
    } catch (e) {
      if (external?.aborted) throw cancelled();
      const name = (e as { name?: string })?.name;
      if (name === "TimeoutError" || name === "AbortError") {
        // 시간 초과여도 구글 쪽에서는 이미지가 만들어져 요금이 나갔을 수 있다. 그래서 자동으로 다시 보내지 않고(이중 과금 방지),
        // 바로 다시 누르지 않도록 안내한다. 요청을 끊었으므로 이미지는 프로그램에 저장되지 않는다 — 확인할 곳은 회원 본인 Google 사용량뿐(2026-10-18 정정).
        // 재시도는 서버 오류·혼잡·연결 실패에만 한다.
        throw new GeminiImageError(`이미지 생성이 ${Math.round(timeoutMs / 1000)}초 안에 끝나지 않아 결과를 받지 못했습니다. 구글 쪽에서는 이미 생성되어 요금이 나갔을 수 있으니, 바로 다시 누르기 전에 Google AI Studio 사용량(https://aistudio.google.com/usage)을 확인해 주세요.`, "TIMEOUT", 504);
      }
      lastError = new GeminiImageError("Gemini 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", "NETWORK", 502);
      continue;
    }
    const data = await res.json().catch(() => null);
    if (res.ok) return extractGeminiImage(data, modelName);
    const error = toGeminiImageError(res.status, data, modelName);
    if (error.code !== "SERVER_ERROR" && error.code !== "RATE_LIMITED") throw error;
    lastError = error;
  }
  throw lastError ?? new GeminiImageError("이미지 생성에 실패했습니다.", "UNKNOWN", 500);
}
