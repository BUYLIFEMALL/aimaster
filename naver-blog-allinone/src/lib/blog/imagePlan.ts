// 이미지 컷 계획·프롬프트 규칙·모델 설정. 순수 함수만 둔다.
import type { ImageRatio, ImageSlot } from "./types";

/** 인물이 나오면 기본 한국인(핵심 원칙 3번) + 이미지 속 글자 금지(글자는 AI가 깨뜨리므로 따로 합성한다). */
export const KOREAN_PEOPLE_RULE = "If the scene includes any people, depict them as Korean/East Asian people by default.";
export const NO_TEXT_RULE =
  "No visible text, letters, words, numbers, captions, logos, or watermarks anywhere in the image, in any language. Keep paper, signs, boards and device screens blank or abstract.";

export function finalizePrompt(prompt: string): string {
  return `${prompt.trim().slice(0, 1500)}\n\n${KOREAN_PEOPLE_RULE} ${NO_TEXT_RULE}`;
}

export const IMAGE_ENGINES = {
  "nano-banana-2": { model: "gemini-3.1-flash-image", size: "2K", temperature: 0.7, label: "Nano Banana 2 · 2K" },
  "nano-banana-2-lite": { model: "gemini-2.5-flash-image", size: "1K", temperature: 0.7, label: "Nano Banana 2 Lite · 1K" },
} as const;
export type ImageEngineId = keyof typeof IMAGE_ENGINES;

export function isImageEngine(value: unknown): value is ImageEngineId {
  return typeof value === "string" && value in IMAGE_ENGINES;
}

/** 전체 컷 수(대표 포함)를 1~5로 고정한다. */
export function clampImageCount(count: unknown): number {
  return Math.min(5, Math.max(1, Math.trunc(Number(count) || 2)));
}

/** AI가 장면 프롬프트를 주지 못했을 때 쓰는 기본 계획(naver-blog-agent 의 buildImagePlan 과 같은 구도). */
export function buildFallbackPlan(title: string, category: string, sections: { title: string }[], total: number, withThumbnail: boolean): ImageSlot[] {
  const shots = ["a hands-on demonstration at a Korean home", "a detailed close-up of the relevant tools and materials", "a comparison scene with distinct items arranged side by side", "a wide practical scene showing the completed outcome"];
  const slots: ImageSlot[] = [];
  if (withThumbnail) {
    slots.push({
      type: "thumbnail",
      caption: `${title} 대표 이미지`.slice(0, 80),
      prompt: `Blog cover photo about ${title}, bright natural lighting, photorealistic, clean composition`,
    });
  }
  const bodyCount = Math.max(0, total - (withThumbnail ? 1 : 0));
  for (let i = 0; i < bodyCount; i++) {
    const section = sections[i % Math.max(sections.length, 1)]?.title || category;
    slots.push({
      type: "body",
      caption: `본문 ${i + 1} · ${section}`.slice(0, 80),
      prompt: `Blog illustration photo about ${title}, topic: ${section}, ${shots[i % shots.length]}, photorealistic, natural lighting`,
    });
  }
  return slots;
}

/** AI가 만든 장면 목록을 컷 계획으로 정리한다(개수·캡션 중복·빈 값 보정). 모자라면 기본 계획으로 채운다. */
export function normalizeImagePlan(
  scenes: unknown,
  fallback: ImageSlot[],
): ImageSlot[] {
  const list = Array.isArray(scenes) ? scenes : [];
  const wantThumb = fallback.some((s) => s.type === "thumbnail");
  const wantBody = fallback.filter((s) => s.type === "body").length;
  const seen = new Set<string>();
  const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\r\n\]\[]/g, " ").trim().slice(0, max) : "");

  const parsed = list
    .map((s) => ({ caption: clean((s as { caption?: unknown })?.caption, 80), prompt: clean((s as { prompt?: unknown })?.prompt, 1500) }))
    .filter((s) => s.caption && s.prompt && !seen.has(s.caption) && seen.add(s.caption) !== undefined);

  const out: ImageSlot[] = [];
  let bodyUsed = 0;
  if (wantThumb) {
    const first = parsed[0];
    out.push(first ? { type: "thumbnail", caption: first.caption, prompt: first.prompt } : fallback.find((s) => s.type === "thumbnail")!);
  }
  const rest = wantThumb ? parsed.slice(1) : parsed;
  for (const s of rest) {
    if (bodyUsed >= wantBody) break;
    out.push({ type: "body", caption: s.caption, prompt: s.prompt });
    bodyUsed++;
  }
  const fb = fallback.filter((s) => s.type === "body");
  while (bodyUsed < wantBody) {
    const f = fb[bodyUsed];
    let caption = f.caption;
    while (out.some((o) => o.caption === caption)) caption += " ";
    out.push({ ...f, caption: caption.trim() });
    bodyUsed++;
  }
  return out;
}
