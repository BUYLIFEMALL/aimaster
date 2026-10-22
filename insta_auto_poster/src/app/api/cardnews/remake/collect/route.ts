import { NextResponse } from "next/server";
import sharp from "sharp";
import { authorize } from "@/lib/cardnews/apiGuard";
import { BlockedUrlError, safeFetch } from "@/lib/cardnews/safeFetch";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserApiKey } from "@/lib/apiKeys";
import { getInstaAccountForUser } from "@/lib/instagram/memberAccount";
import {
  COLLECT_FETCH, COLLECT_MAX_IMAGES, fromApifyItem, fromGraphMedia, isInstagramCdn, normalizeHashtag, normalizeUsername, rankPosts,
  type CollectKind, type CollectSource, type CollectedPost,
} from "@/lib/cardnews/collect";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

// v1.50 🔍 인기 게시물 수집. 회원 본인 값만 쓴다(폴백 없음):
// - 계정 이름 + Facebook 페이지 방식으로 연결한 회원 → 인스타 공식 API business_discovery(무료)
// - 그 밖(Instagram 로그인 방식 회원의 계정 수집, 해시태그) → 회원 본인 Apify 토큰(apify/instagram-scraper)
// 수집 결과는 저장하지 않고 화면에만 돌려준다. action=images 는 고른 게시물 이미지를 1024px JPEG(base64)로 줄여 분석 재료로 돌려준다.
const GRAPH = "https://graph.facebook.com/v21.0";
const APIFY_ACTOR = "apify~instagram-scraper";
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function viaOfficial(token: string, igUserId: string, username: string): Promise<CollectedPost[]> {
  const fields = `business_discovery.username(${username}){username,media.limit(${COLLECT_FETCH}){id,caption,like_count,comments_count,media_type,media_url,thumbnail_url,permalink,timestamp}}`;
  const res = await fetch(`${GRAPH}/${encodeURIComponent(igUserId)}?fields=${encodeURIComponent(fields)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(30_000),
  });
  const d = (await res.json().catch(() => ({}))) as { business_discovery?: { username?: string; media?: { data?: unknown[] } }; error?: { message?: string } };
  if (!res.ok || !d.business_discovery) {
    const msg = String(d.error?.message ?? "");
    throw new BlockedUrlError(/does not exist|cannot be found|not.*business/i.test(msg)
      ? `@${username} 계정을 찾지 못했습니다. 프로페셔널(비즈니스·크리에이터) 공개 계정만 가져올 수 있습니다.`
      : "인스타 공식 API에서 게시물을 가져오지 못했습니다. 인스타 연결을 다시 확인해 주세요.");
  }
  const owner = d.business_discovery.username ?? username;
  return rankPosts((d.business_discovery.media?.data ?? []).map((m) => fromGraphMedia(m, owner)));
}

async function viaApify(token: string, kind: CollectKind, q: string): Promise<CollectedPost[]> {
  const directUrl = kind === "account" ? `https://www.instagram.com/${q}/` : `https://www.instagram.com/explore/tags/${encodeURIComponent(q)}/`;
  let res: Response;
  try {
    res = await fetch(`https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items?timeout=180`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ directUrls: [directUrl], resultsType: "posts", resultsLimit: COLLECT_FETCH, addParentData: false }),
      cache: "no-store",
      signal: AbortSignal.timeout(240_000),
    });
  } catch {
    throw new BlockedUrlError("Apify 수집이 시간 안에 끝나지 않았습니다. 잠시 뒤 다시 시도해 주세요.");
  }
  if (res.status === 401 || res.status === 403) throw new BlockedUrlError("Apify 토큰이 올바르지 않습니다. [API키등록·플랫폼연동]에서 본인 토큰을 확인해 주세요.");
  if (res.status === 402) throw new BlockedUrlError("Apify 크레딧이 부족합니다. Apify 계정의 사용량·결제를 확인해 주세요.");
  if (!res.ok) throw new BlockedUrlError(`Apify 수집에 실패했습니다(${res.status}). 잠시 뒤 다시 시도해 주세요.`);
  const items = (await res.json().catch(() => [])) as unknown[];
  return rankPosts(Array.isArray(items) ? items.map(fromApifyItem) : []);
}

async function toJpegBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  try {
    const { response } = await safeFetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) return null;
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    const out = await sharp(buf).rotate().resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true }).flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer();
    return { mimeType: "image/jpeg", data: out.toString("base64") };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    if (body.action === "images") {
      const urls = (Array.isArray(body.urls) ? body.urls : []).filter((u): u is string => typeof u === "string" && isInstagramCdn(u)).slice(0, COLLECT_MAX_IMAGES);
      if (!urls.length) return json(400, { error: "가져올 이미지가 없습니다." });
      const images = (await Promise.all(urls.map(toJpegBase64))).filter((x): x is { mimeType: string; data: string } => !!x);
      if (!images.length) return json(502, { error: "게시물 이미지를 받지 못했습니다(주소가 만료됐을 수 있음). 다시 수집해 주세요." });
      return json(200, { images });
    }

    const kind: CollectKind = body.kind === "hashtag" ? "hashtag" : "account";
    const q = kind === "account" ? normalizeUsername(String(body.query ?? "")) : normalizeHashtag(String(body.query ?? ""));
    if (!q) return json(400, { error: kind === "account" ? "계정 이름(영문·숫자·밑줄·점)을 확인해 주세요." : "해시태그를 확인해 주세요(띄어쓰기 없이)." });

    if (kind === "account") {
      const account = await getInstaAccountForUser(createAdminClient(), userId);
      if (account?.auth_method === "facebook_login") {
        return json(200, { source: "official" satisfies CollectSource, posts: await viaOfficial(account.access_token, account.ig_user_id, q) });
      }
    }
    const supabase = await createClient();
    const token = await getUserApiKey(supabase, userId, "apify");
    if (!token) {
      return json(400, {
        error: kind === "account"
          ? "다른 계정 수집은 파란 버튼(Facebook 페이지 방식)으로 연결했거나 본인 Apify 토큰이 있어야 합니다. [API키등록·플랫폼연동]에서 Apify 토큰을 등록해 주세요."
          : "해시태그 수집은 본인 Apify 토큰이 필요합니다. [API키등록·플랫폼연동]에서 등록해 주세요.",
        needApiKey: true, provider: "apify",
      });
    }
    return json(200, { source: "apify" satisfies CollectSource, posts: await viaApify(token, kind, q) });
  } catch (e) {
    if (e instanceof BlockedUrlError) return json(400, { error: e.message });
    console.error("[cardnews collect]", String((e as Error)?.message ?? "").slice(0, 200));
    return json(500, { error: "인기 게시물을 가져오는 중 오류가 발생했습니다. 잠시 뒤 다시 시도해 주세요." });
  }
}
