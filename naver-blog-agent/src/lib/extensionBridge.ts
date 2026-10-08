import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateProgramAccessForUser } from "@/lib/access";

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
  title: string;
  article: string;
  tags: string[];
  titleImageIndex: number | null;
  titleImageName?: string;
  bodyImages: { sequence: number; index: number; name: string }[];
  assets: BridgeAsset[];
  publishVisibility: "public";
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
 * - 카테고리는 콘텐츠 분류이므로 네이버 카테고리 선택에는 전달하지 않는다.
 */
export function buildBridgePayload(row: {
  title: string;
  content: string;
  tags?: string[] | null;
  images?: any[] | null;
  is_reserved?: boolean | null;
  scheduled_at?: string | null;
}): BridgePayload {
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
  let poolCursor = 0;
  for (const line of rawLines) {
    const inlineUrl = line.match(/^\[\[IMG:(https:\/\/[^\]]+)\]\]$/i)?.[1] || line.match(/^!\[[^\]]*\]\((https:\/\/[^)\s]+)\)$/i)?.[1];
    let url: string | undefined;
    if (inlineUrl) url = inlineUrl;
    else if (PLACEHOLDER.test(line)) url = bodyPool[poolCursor++]?.url;
    else if (/^\[\[IMG:/.test(line)) continue;
    else {
      lines.push(line);
      continue;
    }
    if (!url) continue; // 연결할 이미지가 없는 자리는 삭제
    const sequence = bodyImages.length + 1;
    const index = assetIndex(url, `blog_img_${sequence}.png`);
    bodyImages.push({ sequence, index, name: `blog_img_${sequence}.png` });
    lines.push(`[IMAGE INSERT - ${sequence}]`);
  }

  const reserve = Boolean(row.is_reserved && row.scheduled_at);
  return {
    title: row.title,
    article: lines.join("\n"),
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean).slice(0, 10) : [],
    titleImageIndex,
    titleImageName: "blog_img_title.png",
    bodyImages,
    assets,
    publishVisibility: "public",
    publishScheduleMode: reserve ? "reserve" : "now",
    ...(reserve ? { scheduledAt: row.scheduled_at as string } : {}),
    breakSentencesInBody: false,
    interactive: true,
  };
}
