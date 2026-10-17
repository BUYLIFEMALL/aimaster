"use strict";
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
 *   ③ 서버 오류·일시적 혼잡(429)·시간 초과·네트워크 끊김에만 1회 재시도(키·한도·요청·안전 차단은 재시도 안 함)
 *   ④ 응답의 모든 조각(parts)에서 이미지를 찾음 ⑤ 안전 필터 차단·이미지 없음·한도 소진·키 오류를 구분한 한국어 안내 ⑥ 키 가리기.
 * 프로그램 고유 코드(server-only, 회원 키 읽기, 저장소 업로드, 화면 문구)는 여기에 넣지 않는다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiImageError = exports.GEMINI_API_BASE = void 0;
exports.maskGeminiKey = maskGeminiKey;
exports.toGeminiImageError = toGeminiImageError;
exports.extractGeminiImage = extractGeminiImage;
exports.generateGeminiImage = generateGeminiImage;
exports.GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
class GeminiImageError extends Error {
    code;
    status;
    /** 회원이 키를 바꾸거나 설정해야 하는 오류 */
    keyProblem;
    constructor(message, code, status) {
        super(message);
        this.name = "GeminiImageError";
        this.code = code;
        this.status = status;
        this.keyProblem = code === "INVALID_KEY" || code === "API_NOT_ENABLED" || code === "PERMISSION_DENIED";
    }
}
exports.GeminiImageError = GeminiImageError;
/** 오류 문구·로그에 키가 섞이지 않게 가린다. */
function maskGeminiKey(text) {
    return String(text ?? "")
        .replace(/([?&]key=)[^&\s"']+/gi, "$1***")
        .replace(/AIza[0-9A-Za-z_-]{20,}/g, "AIza***");
}
/** Gemini 오류 응답을 회원이 이해할 수 있는 한국어 오류로 바꾼다(순수 함수). */
function toGeminiImageError(status, body, modelName = "") {
    const err = body?.error;
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
const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** 응답에서 이미지를 꺼낸다. 이미지가 없으면 이유(안전 차단 등)를 담은 오류를 던진다(순수 함수). */
function extractGeminiImage(data, modelName = "") {
    const res = (data ?? {});
    const block = res.promptFeedback?.blockReason;
    if (block) {
        throw new GeminiImageError(`프롬프트가 Gemini 안전 정책에 걸려 이미지를 만들지 않았습니다(${block}). 표현을 바꿔 다시 시도해 주세요.`, "SAFETY_BLOCKED", 422);
    }
    for (const cand of res.candidates ?? []) {
        const part = cand.content?.parts?.find((p) => p?.inlineData?.data);
        if (part?.inlineData?.data) {
            const text = (cand.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
            return {
                base64: part.inlineData.data.replace(/\s+/g, ""),
                mimeType: part.inlineData.mimeType || "image/png",
                modelName,
                ...(text ? { text } : {}),
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
async function generateGeminiImage(req) {
    const { apiKey, modelName, timeoutMs = 120_000, retries = 1, fetchImpl = fetch, sleep = defaultSleep } = req;
    if (!apiKey)
        throw new GeminiImageError("Gemini API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 등록해 주세요.", "INVALID_KEY", 400);
    const url = req.endpoint || `${exports.GEMINI_API_BASE}/${modelName}:generateContent`;
    const imageConfig = {};
    if (req.aspectRatio)
        imageConfig.aspectRatio = req.aspectRatio;
    if (req.imageSize)
        imageConfig.imageSize = req.imageSize;
    const generationConfig = { responseModalities: req.responseModalities ?? ["IMAGE"] };
    if (Object.keys(imageConfig).length)
        generationConfig.imageConfig = imageConfig;
    if (typeof req.temperature === "number")
        generationConfig.temperature = req.temperature;
    const body = JSON.stringify({
        contents: [{ role: "user", parts: req.parts?.length ? req.parts : [{ text: req.prompt ?? "" }] }],
        generationConfig,
    });
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
        if (attempt > 0)
            await sleep(1500 * attempt);
        let res;
        try {
            res = await fetchImpl(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                body,
                cache: "no-store",
                signal: AbortSignal.timeout(timeoutMs),
            });
        }
        catch (e) {
            const name = e?.name;
            lastError =
                name === "TimeoutError" || name === "AbortError"
                    ? new GeminiImageError(`이미지 생성이 ${Math.round(timeoutMs / 1000)}초 안에 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.`, "TIMEOUT", 504)
                    : new GeminiImageError("Gemini 서버에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", "NETWORK", 502);
            continue;
        }
        const data = await res.json().catch(() => null);
        if (res.ok)
            return extractGeminiImage(data, modelName);
        const error = toGeminiImageError(res.status, data, modelName);
        if (error.code !== "SERVER_ERROR" && error.code !== "RATE_LIMITED")
            throw error;
        lastError = error;
    }
    throw lastError ?? new GeminiImageError("이미지 생성에 실패했습니다.", "UNKNOWN", 500);
}
