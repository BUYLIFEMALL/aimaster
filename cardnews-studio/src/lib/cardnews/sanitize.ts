// 화면이 보낸 프로젝트 데이터를 서버에 저장하기 전에 검증·정리한다(형식, 길이, 범위, 이미지 주소).
// 이미지 주소는 이 회원의 업로드 폴더 주소만 허용한다(다른 회원 이미지·임의 외부 주소 저장 방지).
import { defaultProject, defaultStyle } from "./defaults";
import { COMPOSITIONS, DISPLAY_STYLES, FONTS, MOODS, PAGE_COUNTS, PLACEMENTS, RATIOS, THEME_COLORS, TONES, VISUAL_STYLES } from "./presets";
import type { CardPage, CardStyle, ProjectData, TextStyle } from "./types";

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const str = (v: unknown, max: number, fallback = ""): string => (typeof v === "string" ? v.slice(0, max) : fallback);
const clampNum = (v: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
};
const oneOf = <T extends string>(v: unknown, list: { value: T }[], fallback: T): T =>
  list.some((o) => o.value === v) ? (v as T) : fallback;
const color = (v: unknown, fallback: string): string => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback);

function textStyle(v: unknown, fb: TextStyle, sizeMin: number, sizeMax: number): TextStyle {
  const r = rec(v);
  return {
    size: clampNum(r.size, sizeMin, sizeMax, fb.size),
    weight: clampNum(r.weight, 100, 900, fb.weight),
    dx: clampNum(r.dx, -300, 300, 0),
    dy: clampNum(r.dy, -300, 300, 0),
    color: color(r.color, fb.color),
  };
}

export function allowedImagePrefix(supabaseUrl: string, userId: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/cardnews-images/${userId}/`;
}

function imageUrl(v: unknown, prefix: string): string | undefined {
  return typeof v === "string" && v.startsWith(prefix) && v.length < 400 && !/[\s"'<>]/.test(v) ? v : undefined;
}

/** 디자인 스타일(프로젝트·템플릿 공용)을 허용 목록·범위로 정리한다. */
export function sanitizeStyle(raw: unknown): CardStyle {
  const style = rec(raw);
  const ds = defaultStyle();
  return {
    mood: oneOf(style.mood, MOODS, ds.mood),
    visualStyle: oneOf(style.visualStyle, VISUAL_STYLES, ds.visualStyle),
    composition: oneOf(style.composition, COMPOSITIONS, ds.composition),
    themeColor: oneOf(style.themeColor, THEME_COLORS, ds.themeColor),
    placement: oneOf(style.placement, PLACEMENTS, ds.placement),
    displayStyle: oneOf(style.displayStyle, DISPLAY_STYLES, ds.displayStyle),
    bgOpacity: clampNum(style.bgOpacity, 0, 90, ds.bgOpacity),
    font: oneOf(style.font, FONTS, ds.font),
    headline: textStyle(style.headline, ds.headline, 30, 160),
    sub: textStyle(style.sub, ds.sub, 18, 90),
  };
}

export function sanitizeProject(
  raw: unknown,
  ctx: { supabaseUrl: string; userId: string }
): { ok: true; data: ProjectData } | { ok: false; error: string } {
  const r = rec(raw);
  if (!r.plan || !r.style || !Array.isArray(r.pages)) return { ok: false, error: "프로젝트 데이터 형식이 올바르지 않습니다." };
  if (r.pages.length > 10) return { ok: false, error: "페이지는 최대 10장입니다." };

  const fb = defaultProject();
  const plan = rec(r.plan);
  const prefix = allowedImagePrefix(ctx.supabaseUrl, ctx.userId);
  const pageCount = (PAGE_COUNTS as readonly number[]).includes(plan.pageCount as number) ? (plan.pageCount as ProjectData["plan"]["pageCount"]) : fb.plan.pageCount;

  const cleanStyle = sanitizeStyle(r.style);

  const pages: CardPage[] = r.pages.map((p, i) => {
    const pr = rec(p);
    const urls = (Array.isArray(pr.imageUrls) ? pr.imageUrls : [])
      .map((u) => imageUrl(u, prefix))
      .filter((u): u is string => !!u)
      .slice(-6);
    const current = imageUrl(pr.imageUrl, prefix);
    return {
      id: str(pr.id, 64, `p-${i}`),
      headline: str(pr.headline, 120),
      sub: str(pr.sub, 300),
      imageUrl: current,
      imageUrls: urls.length ? urls : current ? [current] : undefined,
    };
  });

  const engine = rec(r.engine);
  const provider = ["gemini", "openai", "anthropic"].includes(engine.provider as string) ? (engine.provider as "gemini" | "openai" | "anthropic") : fb.engine.provider;

  const rawCaption = r.caption && typeof r.caption === "object" ? rec(r.caption) : undefined;
  const cleanCaption = rawCaption ? {
    headlineHook: str(rawCaption.headlineHook, 200),
    body: str(rawCaption.body, 1500),
    cta: str(rawCaption.cta, 300),
    hashtags: Array.isArray(rawCaption.hashtags) ? rawCaption.hashtags.filter((h): h is string => typeof h === "string").slice(0, 35) : [],
    fullCaption: str(rawCaption.fullCaption, 2500),
  } : undefined;

  return {
    ok: true,
    data: {
      title: str(r.title, 80, fb.title).trim() || fb.title,
      plan: {
        category: str(plan.category, 40, fb.plan.category) || fb.plan.category,
        topic: str(plan.topic, 200),
        tone: oneOf(plan.tone, TONES, fb.plan.tone),
        pageCount,
        ratio: oneOf(plan.ratio, RATIOS, fb.plan.ratio),
      },
      style: cleanStyle,
      pages,
      engine: { provider, model: str(engine.model, 80, fb.engine.model) },
      imageModel: str(r.imageModel, 60, fb.imageModel),
      caption: cleanCaption,
    },
  };
}

/** 프로젝트 데이터에 들어 있는 이 회원의 이미지 파일 경로(저장소 안 경로) 목록 */
export function collectImagePaths(data: ProjectData, supabaseUrl: string, userId: string): string[] {
  const prefix = allowedImagePrefix(supabaseUrl, userId);
  const set = new Set<string>();
  for (const p of data.pages) {
    for (const u of [p.imageUrl, ...(p.imageUrls ?? [])]) {
      if (u && u.startsWith(prefix)) set.add(`${userId}/${u.slice(prefix.length)}`);
    }
  }
  return Array.from(set);
}

/** 저장 전 데이터에는 있었는데 새 데이터에는 없는 내 이미지 파일 경로(이력에서 밀려난 이미지 등) */
export function removedImagePaths(before: ProjectData, after: ProjectData, supabaseUrl: string, userId: string): string[] {
  const keep = new Set(collectImagePaths(after, supabaseUrl, userId));
  return collectImagePaths(before, supabaseUrl, userId).filter((p) => !keep.has(p));
}
