// 저장 API 로 들어온 값을 서버에서 다시 정리한다(허용 목록·길이 제한·이미지 주소는 본인 폴더만). 순수 함수만 둔다.
import { isWritingStyle, isWritingTone } from "./styles";
import { clampImageCount } from "./imagePlan";
import { COLOR_THEMES } from "./article";
import type { ImageRatio, ImageSlot, PostSettings, ReviewStatus, StepLog } from "./types";

export const BUCKET = "allinone-images";
export const MAX_POSTS = 100;

export interface CleanPost {
  title: string;
  summary: string;
  article: string;
  tags: string[];
  settings: PostSettings;
  images: ImageSlot[];
  reviewStatus: ReviewStatus;
  reviewNote: string;
  steps: StepLog[];
}

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

/** 이 회원의 이미지 폴더 공개 주소 접두사 */
export function imagePrefix(supabaseUrl: string, userId: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${userId}/`;
}

const RATIOS: ImageRatio[] = ["16:9", "1:1", "4:5", "9:16"];

export function sanitizePost(raw: unknown, supabaseUrl: string, userId: string): { ok: true; value: CleanPost } | { ok: false; error: string } {
  const r = rec(raw);
  const title = str(r.title, 200).trim();
  const article = str(r.article, 60000);
  if (!title) return { ok: false, error: "제목이 비어 있습니다." };
  if (!article.trim()) return { ok: false, error: "본문이 비어 있습니다." };

  const prefix = imagePrefix(supabaseUrl, userId);
  const seen = new Set<string>();
  const images: ImageSlot[] = (Array.isArray(r.images) ? r.images : [])
    .slice(0, 8)
    .map((i): ImageSlot | null => {
      const o = rec(i);
      const caption = str(o.caption, 80).replace(/[\r\n\]\[]/g, " ").trim();
      const prompt = str(o.prompt, 1500).trim();
      if (!caption || seen.has(caption)) return null;
      seen.add(caption);
      const url = typeof o.url === "string" && o.url.startsWith(prefix) && o.url.length < 400 ? o.url : undefined;
      return { type: o.type === "thumbnail" ? "thumbnail" : "body", caption, prompt, ...(url ? { url } : {}) };
    })
    .filter((x): x is ImageSlot => x !== null);

  const s = rec(r.settings);
  const settings: PostSettings = {
    tone: isWritingTone(s.tone) ? s.tone : "해요체",
    style: isWritingStyle(s.style) ? s.style : "default",
    targetLength: Math.max(500, Math.min(4000, Math.round(Number(s.targetLength) || 2000))),
    imageCount: clampImageCount(s.imageCount),
    ratio: RATIOS.includes(s.ratio as ImageRatio) ? (s.ratio as ImageRatio) : "16:9",
    themeId: COLOR_THEMES.some((t) => t.id === s.themeId) ? (s.themeId as string) : "blue-gray",
    topic: str(s.topic, 200),
    withThumbnailText: s.withThumbnailText === true,
  };

  const st = typeof r.reviewStatus === "string" ? r.reviewStatus.toUpperCase() : "";
  const reviewStatus: ReviewStatus = st === "PASS" || st === "WARN" || st === "FAIL" ? st : "UNKNOWN";

  const steps: StepLog[] = (Array.isArray(r.steps) ? r.steps : []).slice(0, 12).map((x) => {
    const o = rec(x);
    return { step: str(o.step, 60), status: o.status === "warn" ? "warn" : "done", message: str(o.message, 400) } as StepLog;
  });

  return {
    ok: true,
    value: {
      title,
      summary: str(r.summary, 300),
      article,
      tags: (Array.isArray(r.tags) ? r.tags : []).filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.replace(/^#/, "").trim().slice(0, 40)).slice(0, 15),
      settings,
      images,
      reviewStatus,
      reviewNote: str(r.reviewNote, 1000),
      steps,
    },
  };
}

/** 이미지 컷 목록에 들어 있는 이 회원의 저장소 경로(`<user>/<파일>`) */
export function imagePaths(images: ImageSlot[], supabaseUrl: string, userId: string): string[] {
  const prefix = imagePrefix(supabaseUrl, userId);
  return Array.from(new Set(images.filter((i) => i.url?.startsWith(prefix)).map((i) => `${userId}/${i.url!.slice(prefix.length)}`)));
}

/** 저장 전에는 있었는데 새 데이터에는 없는 이미지 파일 경로 */
export function removedImagePaths(before: ImageSlot[], after: ImageSlot[], supabaseUrl: string, userId: string): string[] {
  const keep = new Set(imagePaths(after, supabaseUrl, userId));
  return imagePaths(before, supabaseUrl, userId).filter((p) => !keep.has(p));
}
