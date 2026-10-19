// StudioPage에서 옮긴 공통 도우미·타입 (2026-10-17 파일 나누기, 내용 변경 없음)

export const strategies = [
  ["C-Rank 기본", "전문성과 실제 경험 중심의 일반 SEO 블로그(원문)"],
  ["ALCON", "여러 검색 의도를 소제목별로 넓게 답하는 구성"],
  ["AEO", "첫 요약, 비교, FAQ 중심의 답변형 구조"],
  ["홈판 스토리", "공감되는 이야기 흐름과 읽기 체류를 고려한 구성"],
  ["인사이트 엣지", "좁은 주제를 깊게 다루고 실용적 판단 기준을 제시"],
];

export type DraftRecord = {
  id: string;
  topic: string;
  keywords: string[];
  strategy?: string;
  title: string;
  body: string;
  seo_report?: Record<string, string> | null;
  created_at?: string;
  image_path?: string | null;
  image_model?: string | null;
  image_mime_type?: string | null;
  naver_input_status?: "not_started" | "in_progress" | "completed" | "publish_ready" | "failed";
  naver_input_completed_at?: string | null;
  naver_input_error?: string | null;
  category_id?: string | null;
  naver_category?: { id: string; name: string } | null;
};

export type ContentImageSlot = "content-1" | "content-2" | "content-3";
export type ContentImage = { slot: ContentImageSlot; sentence: string; prompt?: string; path?: string; mimeType?: string; model?: string };
export type ContentBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; slot: "cover" | ContentImageSlot; alt: string };

export function getContentImages(draft: DraftRecord | null): ContentImage[] {
  const images = (draft?.seo_report as unknown as { contentImages?: unknown } | null)?.contentImages;
  return Array.isArray(images) ? images.filter((item): item is ContentImage => typeof item === "object" && item !== null && "slot" in item && "sentence" in item) : [];
}

export function getContentBlocks(draft: DraftRecord | null): ContentBlock[] {
  const blocks = (draft?.seo_report as unknown as { contentBlocks?: unknown } | null)?.contentBlocks;
  if (!Array.isArray(blocks)) return [];
  return blocks.filter((item): item is ContentBlock => {
    if (typeof item !== "object" || item === null || !("id" in item) || !("type" in item)) return false;
    if (item.type === "text") return "text" in item && typeof item.text === "string";
    return item.type === "image" && "slot" in item && (item.slot === "cover" || item.slot === "content-1" || item.slot === "content-2" || item.slot === "content-3");
  });
}

export function getParagraphStart(body: string, sentencePosition: number) {
  const precedingText = body.slice(0, sentencePosition);
  const separators = [...precedingText.matchAll(/\n\s*\n/g)];
  const lastSeparator = separators.at(-1);
  return lastSeparator?.index === undefined ? 0 : lastSeparator.index + lastSeparator[0].length;
}

export function fitContentBlockTextarea(element: HTMLTextAreaElement) {
  element.style.height = "auto";
  element.style.height = `${element.scrollHeight}px`;
}

export function createContentBlocks(draft: DraftRecord, images: ContentImage[] = getContentImages(draft)): ContentBlock[] {
  const blocks: ContentBlock[] = draft.image_path ? [{ id: "cover", type: "image", slot: "cover", alt: "대표 이미지" }] : [];
  const sortedImages = images
    .map((image) => {
      const sentencePosition = draft.body.indexOf(image.sentence);
      return { ...image, position: sentencePosition < 0 ? -1 : getParagraphStart(draft.body, sentencePosition) };
    })
    .filter((image) => image.position >= 0)
    .sort((a, b) => a.position - b.position)
    .filter((image, index, list) => index === 0 || image.position !== list[index - 1].position);
  let cursor = 0;
  for (const image of sortedImages) {
    const before = draft.body.slice(cursor, image.position).trim();
    if (before) blocks.push({ id: `text-${blocks.length + 1}`, type: "text", text: before });
    blocks.push({ id: image.slot, type: "image", slot: image.slot, alt: image.sentence });
    cursor = image.position;
  }
  const rest = draft.body.slice(cursor).trim();
  if (rest) blocks.push({ id: `text-${blocks.length + 1}`, type: "text", text: rest });
  return blocks.length ? blocks : [{ id: "text-1", type: "text", text: draft.body }];
}

export function withoutContentImages(draft: DraftRecord): DraftRecord {
  const report = { ...(draft.seo_report ?? {}) } as Record<string, unknown>;
  delete report.contentImages;
  delete report.contentBlocks;
  return { ...draft, seo_report: report as Record<string, string> };
}

export type RecommendedTitle = { title: string; intent?: string };

export type ContentAnalysis = {
  topic: string;
  coreKeywords: string[];
  relatedKeywords: string[];
  searchIntent: string;
  targetReader: string;
  strengths: string[];
  improvements: string[];
  suggestedTitle: string;
  outline: string[];
};

export type TitleRecommendationRecord = {
  id: string;
  topic: string;
  keywords: string;
  titles: RecommendedTitle[];
  selected_title?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const reportLabels: Record<string, string> = {
  searchIntent: "검색 의도",
  strength: "블로그(원문) 강점",
  factCheck: "사실 확인",
  readability: "가독성",
  paragraphCount: "문단 수",
  lengthNotice: "분량 안내",
};
