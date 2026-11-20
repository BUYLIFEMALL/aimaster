// 이미지 모델 선택(화면·서버 공용) — 2026-11-20, CC-SNS-01, 주인님 지시 「진행해보자」(R3 1단계: Gemini 3개 중 고르기).
// 모델 이름·화질 규칙은 공용 사본 ./nanoBananaModels.ts(기준 ai-image-studio)를 그대로 쓴다 — 그 파일은 고치지 않는다.
// 이 앱만의 값(등급 이름·화면 표시·기본값)은 여기서 정한다(사본 규칙: 프로그램별 차이는 호출하는 쪽에서 덮어쓴다).
// 주인님 결정(2026-11-20): 기본은 최고 품질(지금까지 쓰던 Gemini 3 Pro Image) 유지 · 가성비 모델도 선택지에 넣는다.
// Master 판정(msg_fb385d6793d7): 모델을 고르지 않은 요청은 지금과 완전히 같게(3 Pro·화질 값 그대로).
//   고른 요청은 서버 허용 목록과 모델별 화질 규칙을 통과해야 하고, 통과하지 못하면 키 조회·모델 호출 없이 거절한다(조용히 바꾸지 않는다).
// ★ 각 모델이 인물 참조 사진을 받고 인물을 얼마나 지키는지는 아직 실제로 비교하지 않았다(R3 2단계 비교 예정).
import { NANO_BANANA_MODEL_CONFIGS, type ImageSizeOption, type NanoBananaModelType } from "./nanoBananaModels";

export type ImageTier = "top" | "balanced" | "value";

export type ImageModelOption = { tier: ImageTier; nb: NanoBananaModelType; label: string; note: string };

/** 서버 허용 목록이자 화면 순서: 최고 품질(기본) → 균형 → 가성비 */
export const IMAGE_MODELS: readonly ImageModelOption[] = [
  { tier: "top", nb: "nanobanana-pro", label: "최고 품질 · Gemini 3 Pro Image", note: "지금까지 쓰던 모델 · 인물 묘사가 가장 정밀" },
  { tier: "balanced", nb: "nanobanana-2-2k", label: "균형 · Gemini Nano Banana 2.1", note: "비용이 최고 품질의 약 1/4(1K 기준)" },
  { tier: "value", nb: "nanobanana", label: "가성비 · Gemini 3.1 Flash-Lite Image", note: "가장 저렴 · 1K만 지원" },
];

/** 아무것도 고르지 않은 회원 = 지금까지와 같은 모델 */
export const DEFAULT_IMAGE_TIER: ImageTier = "top";

/** 브라우저에 고른 값을 둘 때의 이름 */
export const IMAGE_TIER_STORAGE_KEY = "aif_image_tier_v1";

const findTier = (v: unknown) => (typeof v === "string" ? IMAGE_MODELS.find((m) => m.tier === v) : undefined);

type TierStore = { getItem(k: string): string | null; setItem(k: string, v: string): void };
const browserStore = (): TierStore | null => (typeof localStorage === "undefined" ? null : localStorage);

/** 화면용: 이 브라우저에 둔 등급을 읽는다. 없거나 목록 밖이거나 읽지 못하면 null(→ 기본 모델) */
export function loadImageTier(store: TierStore | null = browserStore()): ImageTier | null {
  try {
    return findTier(store?.getItem(IMAGE_TIER_STORAGE_KEY))?.tier ?? null;
  } catch {
    return null;
  }
}

/** 화면용: 고른 등급만 이 브라우저에 둔다(목록 밖 값·다른 값은 쓰지 않는다). 실패해도 화면은 그대로 */
export function saveImageTier(tier: unknown, store: TierStore | null = browserStore()): boolean {
  const m = findTier(tier);
  if (!m || !store) return false;
  try {
    store.setItem(IMAGE_TIER_STORAGE_KEY, m.tier);
    return true;
  } catch {
    return false;
  }
}

/** 화면용: 저장값을 쓸 수 있는 등급으로(목록 밖·글자 아님은 기본). 서버 판정에는 쓰지 않는다 */
export function currentImageTier(v: unknown): ImageTier {
  return findTier(v)?.tier ?? DEFAULT_IMAGE_TIER;
}

/** 그 등급이 받는 화질(목록 밖이면 기본 등급의 것) */
export function imageSizesOf(tier: unknown): readonly ImageSizeOption[] {
  return NANO_BANANA_MODEL_CONFIGS[(findTier(tier) ?? findTier(DEFAULT_IMAGE_TIER)!).nb].sizes;
}

export const IMAGE_SELECTION_MESSAGE = {
  IMAGE_MODEL_INVALID: "이미지 모델 선택값이 올바르지 않습니다. 화면을 새로고침한 뒤 다시 골라 주세요.",
  IMAGE_QUALITY_UNSUPPORTED: "고른 이미지 모델은 이 화질을 지원하지 않습니다. 화질을 바꾸거나 다른 모델을 골라 주세요.",
} as const;
export type ImageSelectionCode = keyof typeof IMAGE_SELECTION_MESSAGE;

/** 「고르지 않음」 = 칸이 없거나 null. 빈 글·그 밖의 값은 「고름」으로 보고 검사한다 */
const notSelected = (v: unknown) => v === undefined || v === null;

/**
 * 요청 설정의 모델 선택 검사(키 조회·모델 호출 전에 쓴다).
 * - 고르지 않음: 통과(지금과 같은 동작)
 * - 고름: 등급이 허용 목록에 있어야 하고, 화질은 비었거나(→1K) 그 모델이 받는 값이어야 한다
 */
export function checkImageSelection(config: Record<string, unknown>): { ok: true } | { ok: false; code: ImageSelectionCode; message: string } {
  if (notSelected(config.imageModel)) return { ok: true };
  const m = findTier(config.imageModel);
  if (!m) return { ok: false, code: "IMAGE_MODEL_INVALID", message: IMAGE_SELECTION_MESSAGE.IMAGE_MODEL_INVALID };
  const q = config.quality;
  if (q === undefined || q === null || q === "") return { ok: true };
  if (typeof q !== "string" || !(NANO_BANANA_MODEL_CONFIGS[m.nb].sizes as readonly string[]).includes(q)) {
    return { ok: false, code: "IMAGE_QUALITY_UNSUPPORTED", message: IMAGE_SELECTION_MESSAGE.IMAGE_QUALITY_UNSUPPORTED };
  }
  return { ok: true };
}

/**
 * 실제로 보낼 모델·화질. 검사를 통과한 설정에만 쓴다(통과하지 못한 설정이면 던진다 — 호출 전 마지막 방어).
 * 고르지 않은 요청은 지금까지와 똑같이: 3 Pro, 화질은 받은 값 그대로(비었으면 1K).
 */
export function resolveImageSelection(config: Record<string, unknown>): { modelName: string; imageSize: string } {
  const check = checkImageSelection(config);
  if (!check.ok) throw new Error(check.message);
  const q = typeof config.quality === "string" && config.quality ? config.quality : "1K";
  const m = notSelected(config.imageModel) ? findTier(DEFAULT_IMAGE_TIER)! : findTier(config.imageModel)!;
  return { modelName: NANO_BANANA_MODEL_CONFIGS[m.nb].modelName, imageSize: q };
}
