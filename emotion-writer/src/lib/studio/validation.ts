import { allowedPhotoUrl as sharedAllowedPhotoUrl, PhotoError } from "./photoSearch";
import {
  IMAGE_MODELS,
  OPENAI_IMAGE_MODELS,
  FREE_IMAGE_MODELS,
  FREE_IMAGE_ENGINE_ENABLED,
  RATIOS,
  STYLES,
  TEXT_MODELS,
  currentTextModel,
  type Ratio,
} from "./config";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim())
    throw new AppError(`${label}을 입력해 주세요.`);
  if (value.trim().length > max)
    throw new AppError(`${label}은 ${max}자 이내로 입력해 주세요.`);
  return value.trim();
}
export function validateCopy(input: Record<string, unknown>) {
  const topic = text(input.topic, "주제", 120);
  if (!STYLES.includes(input.style as (typeof STYLES)[number]))
    throw new AppError("글귀 스타일을 선택해 주세요.");
  if (![5, 6, 7, 8].includes(Number(input.lines)))
    throw new AppError("줄 수를 선택해 주세요.");
  const model = currentTextModel(input.model);
  if (!TEXT_MODELS.some((m) => m.id === model))
    throw new AppError("지원하지 않는 글귀 모델입니다.");
  return {
    topic,
    style: String(input.style),
    lines: Number(input.lines),
    model: String(model),
  };
}
export function validateImage(input: Record<string, unknown>) {
  const quote = text(input.quote, "문구", 700);
  const topic = text(input.topic, "주제", 120);
  if (!RATIOS.includes(input.ratio as Ratio))
    throw new AppError("이미지 비율을 선택해 주세요.");

  // ECOM-20261118-03(QA049 I-F01): 제공자·모델은 문자열·길이·허용 목록으로만 — 다른 회사 모델·객체·임의 값은 외부 호출 전에 거절.
  const providerRaw = input.provider ?? "gemini";
  if (typeof providerRaw !== "string" || !["gemini", "openai", "free"].includes(providerRaw))
    throw new AppError("지원하지 않는 이미지 제공자입니다.");
  const provider = providerRaw as "gemini" | "openai" | "free";
  if (provider === "free" && !FREE_IMAGE_ENGINE_ENABLED)
    throw new AppError("무료 모델(FLUX)은 준비 중입니다. 나노바나나 또는 OpenAI 이미지를 골라 주세요.");
  const allowed = provider === "gemini" ? IMAGE_MODELS : provider === "openai" ? OPENAI_IMAGE_MODELS : FREE_IMAGE_MODELS;
  const modelRaw = input.model;
  let model: string;
  if (modelRaw === undefined || modelRaw === null || modelRaw === "") model = allowed[0].id;
  else if (typeof modelRaw === "string" && modelRaw.length <= 64 && allowed.some((m) => m.id === modelRaw)) model = modelRaw;
  else throw new AppError("지원하지 않는 이미지 모델입니다.");

  return {
    quote,
    topic,
    ratio: input.ratio as Ratio,
    model,
    provider,
  };
}
export function parseQuotes(raw: string): string[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(
      raw.replace(/^\s*```(?:json)?\s*/, "").replace(/\s*```\s*$/, ""),
    );
  } catch {
    throw new AppError("글귀 응답을 읽지 못했습니다. 다시 생성해 주세요.", 502);
  }
  const quotes = Array.isArray(parsed)
    ? parsed
    : (parsed as { quotes?: unknown })?.quotes;
  if (
    !Array.isArray(quotes) ||
    quotes.length !== 5 ||
    quotes.some(
      (v) => typeof v !== "string" || !v.trim() || v.trim().length > 700,
    )
  ) {
    throw new AppError(
      "글귀 후보 5개를 받지 못했습니다. 다시 생성해 주세요.",
      502,
    );
  }
  const normalized = quotes.map((v) => String(v).trim());
  if (new Set(normalized).size !== 5)
    throw new AppError("중복된 글귀가 있습니다. 다시 생성해 주세요.", 502);
  return normalized;
}
// Only provider CDNs and photo paths are accepted. No arbitrary URL proxy or redirects.
// 규칙은 공용 기준 코드 `free-photo-search` 사본(./photoSearch)에 있고, 여기서는 오류만 AppError로 바꾼다.
export function allowedPhotoUrl(value: unknown): URL {
  try {
    return sharedAllowedPhotoUrl(value);
  } catch (err) {
    if (err instanceof PhotoError) throw new AppError(err.message, err.status);
    throw err;
  }
}
