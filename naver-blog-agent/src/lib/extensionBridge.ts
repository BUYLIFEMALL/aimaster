import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateProgramAccessForUser } from "@/lib/access";
import { normalizeNaverTags, readNaverCategory, readNaverExecutionMode } from "@/lib/naverPublishing";

/** 확장 토큰으로 회원을 확인하고 현재 이용 권한을 다시 검증한다. */
export async function authenticateExtension(
  req: Request
): Promise<{ ok: true; userId: string; token: string; admin: any } | { ok: false; error: string; status: number }> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();
  if (!token) return { ok: false, error: "인증 토큰이 누락되었습니다.", status: 401 };

  const admin = createAdminClient() as any;
  const { data: record } = await admin
    .from("nba_extension_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();
  if (!record) return { ok: false, error: "유효하지 않은 토큰입니다. 다시 연결해주세요.", status: 401 };

  const access = await evaluateProgramAccessForUser(record.user_id);
  if (!access.allowed) return { ok: false, error: access.error as string, status: access.status as number };

  return { ok: true, userId: record.user_id, token, admin };
}

export interface BridgeAsset {
  url: string;
  name: string;
}

export interface BridgePayload {
  executionMode: "prepare" | "publish";
  title: string;
  article: string;
  tags: string[];
  category?: string;
  categoryId?: string;
  titleImageIndex: number | null;
  titleImageName?: string;
  bodyImages: { sequence: number; index: number; name: string }[];
  assets: BridgeAsset[];
  publishVisibility: "private" | "public";
  publishScheduleMode: "now" | "reserve";
  scheduledAt?: string;
  breakSentencesInBody: boolean;
  interactive: boolean;
}

const PLACEHOLDER = /^\[IMAGE INSERT\s*-\s*[^\]]*\]$/i;
const HTML_HINT = /<\/?(p|h[1-6]|img|div|br|ul|ol|li|blockquote|strong|em|span)\b/i;

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** 스마트 에디터가 저장한 HTML을 확장이 읽는 줄 단위 원고([SECTION]/문단/이미지 URL)로 바꾼다. */
function htmlToLines(html: string): string[] {
  const marked = html
    .replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, "\n[[IMG:$1]]\n")
    .replace(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi, (_m, inner) => `\n[SECTION - ${inner.replace(/<[^>]+>/g, "").trim()}]\n`)
    .replace(/<\/(p|div|li|blockquote|h[4-6]|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(marked)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * 웹 원고(content + images)를 확장 발행 작업으로 변환한다.
 * - 본문 이미지 자리표시자는 순서대로 실제 이미지에 연결하고, 이미지가 없는 자리는 지운다(확장 검증과 일치).
 * - 글감 분류는 전달하지 않는다. 별도로 저장한 네이버 발행 카테고리만 전달한다.
 */
export function buildBridgePayload(row: {
  title: string;
  content: string;
  tags?: string[] | null;
  images?: any[] | null;
  is_reserved?: boolean | null;
  scheduled_at?: string | null;
  publish_visibility?: string | null;
  blog_id?: string;
  research_summary?: unknown;
}, defaultCategory?: string): BridgePayload {
  const naverCategory = readNaverCategory(row.research_summary, row.blog_id || "");
  const images = (Array.isArray(row.images) ? row.images : []).filter((img) => typeof img?.url === "string" && /^https:\/\//i.test(img.url));
  const thumbnail = images.find((img) => img.type === "thumbnail");
  const bodyPool = images.filter((img) => img !== thumbnail && img.type !== "thumbnail");

  const assets: BridgeAsset[] = [];
  const assetIndex = (url: string, name: string) => {
    const found = assets.findIndex((a) => a.url === url);
    if (found >= 0) return found;
    assets.push({ url, name });
    return assets.length - 1;
  };

  let titleImageIndex: number | null = null;
  if (thumbnail) titleImageIndex = assetIndex(thumbnail.url, "blog_img_title.png");

  const rawLines = HTML_HINT.test(row.content || "")
    ? htmlToLines(row.content)
    : String(row.content || "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const bodyImages: BridgePayload["bodyImages"] = [];
  const lines: string[] = [];
  const inlineImageUrl = (line: string) => line.match(/^\[\[IMG:(https:\/\/[^\]]+)\]\]$/i)?.[1]
    || line.match(/^!\[[^\]]*\]\((https:\/\/[^)\s]+)\)$/i)?.[1];
  const inlineUrls = rawLines.map(inlineImageUrl).filter((url): url is string => Boolean(url));
  // v1.58 이하의 편집기는 [대표, 본문1, 본문2]를 본문 3자리에 넣어 본문3을 누락했다.
  // 정확히 그 순서의 생성 이미지가 들어간 기존 원고만 본문 이미지 순서로 복구한다.
  const shiftedEditorImages = Boolean(thumbnail && inlineUrls.length && inlineUrls.length <= bodyPool.length
    && inlineUrls.every((url, index) => url === images[index]?.url)
    && inlineUrls[0] === thumbnail.url);
  const usedUrls = new Set<string>(thumbnail ? [thumbnail.url] : []);
  let inlineCursor = 0;
  let poolCursor = 0;
  for (const line of rawLines) {
    const inlineUrl = inlineImageUrl(line);
    let url: string | undefined;
    if (inlineUrl) url = shiftedEditorImages ? bodyPool[inlineCursor++]?.url : inlineUrl;
    else if (PLACEHOLDER.test(line)) {
      while (bodyPool[poolCursor] && usedUrls.has(bodyPool[poolCursor].url)) poolCursor++;
      url = bodyPool[poolCursor++]?.url;
    }
    else if (/^\[\[IMG:/.test(line)) continue;
    else {
      lines.push(line);
      continue;
    }
    if (!url || usedUrls.has(url)) continue; // 같은 이미지와 표지를 본문에 다시 삽입하지 않는다.
    usedUrls.add(url);
    const sequence = bodyImages.length + 1;
    const index = assetIndex(url, `blog_img_${sequence}.png`);
    bodyImages.push({ sequence, index, name: assets[index].name });
    lines.push(`[IMAGE INSERT - ${sequence}]`);
  }

  const reserve = Boolean(row.is_reserved && row.scheduled_at);
  return {
    title: row.title,
    executionMode: readNaverExecutionMode(row.research_summary, row.blog_id || ""),
    article: lines.join("\n"),
    tags: normalizeNaverTags(row.tags),
    ...(naverCategory ? { category: naverCategory.name, categoryId: naverCategory.id }
      : defaultCategory?.trim() ? { category: defaultCategory.trim() } : {}),
    titleImageIndex,
    titleImageName: "blog_img_title.png",
    bodyImages,
    assets,
    // 'public'으로 명시된 경우에만 전체공개. 값이 없거나 알 수 없으면 비공개(실수로 공개되지 않게).
    publishVisibility: row.publish_visibility === "public" ? "public" : "private",
    publishScheduleMode: reserve ? "reserve" : "now",
    ...(reserve ? { scheduledAt: row.scheduled_at as string } : {}),
    breakSentencesInBody: false,
    interactive: true,
  };
}
