// 병합 B-4(작업실 → SEO 스튜디오, blog-workroom ImagesView RATIOS·STYLES·참고 이미지): 이미지 비율·표현 방식·참고 사진.
// 프롬프트 문구는 SEO 스튜디오 고유(docs/IMAGE_PROMPT_RULES.md — 한국인 묘사·글자 금지 유지). 아무것도 고르지 않으면 예전과 같은 16:9·기본 표현.
// 실행 시점 import 없음(화면·서버·시험 공용). 참고 사진은 저장하지 않고 그 요청에만 쓴다.
export type ImageRatio = "16:9" | "4:3" | "1:1" | "3:4";
export const IMAGE_RATIOS: { value: ImageRatio; label: string; words: string }[] = [
  { value: "16:9", label: "16:9 가로(기본)", words: "16:9 landscape" },
  { value: "4:3", label: "4:3 가로", words: "4:3 landscape" },
  { value: "1:1", label: "1:1 정사각형", words: "1:1 square" },
  { value: "3:4", label: "3:4 세로", words: "3:4 portrait" },
];
export type ImageStyle = "default" | "phone" | "card" | "illustration" | "closeup" | "place";
// photo=false(정보 카드·일러스트)는 기본 프롬프트의 「photorealistic·documentary」 문구를 빼고 이 방식을 맨 앞에 둔다(2026-10-24 실측: 그대로 두면 실사 사진으로 나옴).
export const IMAGE_STYLES: { value: ImageStyle; label: string; prompt: string; photo: boolean; kind?: string }[] = [
  { value: "default", label: "기본(사진 같은 편집 이미지)", prompt: "", photo: true },
  { value: "phone", label: "스마트폰 생활 사진", prompt: "Style: a casual smartphone photo taken by an ordinary person in daily life, natural and slightly imperfect framing.", photo: true },
  { value: "card", label: "깔끔한 정보 카드", prompt: "Style: a clean flat information-card visual with simple shapes, icons and plenty of white space; still no readable text or letters.", photo: false, kind: "clean flat-design information card illustration (vector style, not a photo)" },
  { value: "illustration", label: "일러스트", prompt: "Style: a soft, friendly digital illustration with clean lines and gentle colors, not a photo.", photo: false, kind: "soft digital illustration (not a photo)" },
  { value: "closeup", label: "제품·사물 클로즈업", prompt: "Style: a close-up product or object shot with shallow depth of field and clean background.", photo: true },
  { value: "place", label: "풍경·장소", prompt: "Style: a wide scenic shot of the place or landscape, people small or absent.", photo: true },
];

export const readImageRatio = (v: unknown): ImageRatio => (IMAGE_RATIOS.some((r) => r.value === v) ? v as ImageRatio : "16:9");
export const readImageStyle = (v: unknown): ImageStyle => (IMAGE_STYLES.some((s) => s.value === v) ? v as ImageStyle : "default");
export const ratioWords = (r: ImageRatio) => IMAGE_RATIOS.find((x) => x.value === r)!.words;
export const stylePromptLine = (s: ImageStyle) => IMAGE_STYLES.find((x) => x.value === s)!.prompt;
export const styleInfo = (s: ImageStyle) => IMAGE_STYLES.find((x) => x.value === s)!;

export const MAX_IMAGE_REFS = 5;
const REF_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_REF_CHARS = 1_000_000;    // 장당 base64 약 0.75MB — 화면에서 긴 변 1,280px JPEG로 줄여 보낸다
const MAX_REFS_TOTAL = 3_200_000;   // Vercel 요청 본문 4.5MB 안
export interface ImageRef { mimeType: string; data: string }
export class ImageRefError extends Error {}

/** 요청의 참고 사진 검사(최대 5장·JPEG/PNG/WebP·장당·합계 크기). 없으면 빈 배열. */
export function readImageRefs(value: unknown): ImageRef[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new ImageRefError("참고 사진 형식을 확인해 주세요.");
  if (value.length > MAX_IMAGE_REFS) throw new ImageRefError(`참고 사진은 ${MAX_IMAGE_REFS}장까지 넣을 수 있습니다.`);
  let total = 0;
  return value.map((item) => {
    const r = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const mimeType = typeof r.mimeType === "string" ? r.mimeType : "";
    const data = typeof r.data === "string" ? r.data.replace(/\s+/g, "") : "";
    if (!REF_TYPES.includes(mimeType) || !data || !/^[A-Za-z0-9+/=]+$/.test(data)) throw new ImageRefError("참고 사진은 JPG·PNG·WebP만 넣을 수 있습니다.");
    if (data.length > MAX_REF_CHARS) throw new ImageRefError("참고 사진 한 장이 너무 큽니다. 다시 첨부해 주세요.");
    total += data.length;
    if (total > MAX_REFS_TOTAL) throw new ImageRefError("참고 사진이 모두 합쳐 너무 큽니다. 장수를 줄여 주세요.");
    return { mimeType, data };
  });
}

export const REF_RULE = "Reference photos are attached. Use them only for mood, color palette and composition. Do not copy any person's face, any text, logo or watermark from them; create a new original scene.";
/** 참고 사진이 있으면 글 + 사진 조각(Gemini parts), 없으면 null(프롬프트 글만 보냄). */
export function refParts(prompt: string, refs: ImageRef[]) {
  if (!refs.length) return null;
  return [{ text: `${prompt} ${REF_RULE}` }, ...refs.map((r) => ({ inlineData: { mimeType: r.mimeType, data: r.data } }))];
}
