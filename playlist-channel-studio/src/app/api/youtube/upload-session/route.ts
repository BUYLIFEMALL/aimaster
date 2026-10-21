import { NextResponse, type NextRequest } from "next/server";
import { requireAccess } from "@/lib/routeGuard";
import { youtubeStateMessage, youtubeUploadToken } from "@/lib/youtube/account";
import { createYoutubeResumableSession } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "private, no-store" };
const PRIVACY = ["private", "unlisted", "public"] as const;
const CATEGORIES = ["10", "24", "22"]; // 음악·엔터테인먼트·인물/블로그
const MAX_BYTES = 8 * 1024 * 1024 * 1024; // 플레이리스트는 길어서 가사영상(2GB)보다 넉넉하게 — 유튜브 한도 256GB
const bad = (error: string, status = 400, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });

// v1.22 유튜브 업로드 주소 만들기(가사영상 v1.04에서 복사) — 영상 파일은 서버를 거치지 않고 브라우저가 이 주소로 바로 보낸다(Vercel 요청 4.5MB 한도).
// 접근 토큰은 돌려주지 않는다(업로드 주소는 이 영상 한 개에만 쓸 수 있음). 실제 올리기는 회원이 버튼을 눌렀을 때만.
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return bad("요청 출처를 확인할 수 없습니다.", 403);
  const g = await requireAccess(); if (g.error) return g.error;
  try {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const title = String(b.title ?? "").replace(/[<>]/g, "").trim();
    if (!title) return bad("영상 제목을 넣어 주세요.");
    if (title.length > 100) return bad("유튜브 제목은 100자까지입니다.");
    const description = String(b.description ?? "").replace(/[<>]/g, "").slice(0, 5000);
    const tags: string[] = [];
    let tagLen = 0;
    for (const raw of Array.isArray(b.tags) ? b.tags : []) {
      const t = String(raw).replace(/[<>,"]/g, "").trim().slice(0, 60);
      if (!t || tagLen + t.length > 450) continue;
      tags.push(t); tagLen += t.length + 1;
    }
    const privacy = PRIVACY.includes(b.privacy as (typeof PRIVACY)[number]) ? (b.privacy as (typeof PRIVACY)[number]) : "private";
    const categoryId = CATEGORIES.includes(String(b.categoryId)) ? String(b.categoryId) : "10";
    const size = Number(b.size);
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) return bad("영상 파일 크기를 확인할 수 없습니다. MP4를 다시 골라 주세요.");
    let publishAt: string | null = null;
    if (b.publishAt) {
      const d = new Date(String(b.publishAt));
      if (Number.isNaN(d.getTime())) return bad("예약 공개 시각이 올바르지 않습니다.");
      if (d.getTime() < Date.now() + 15 * 60_000) return bad("예약 공개는 지금부터 15분 뒤 이후로 정해 주세요.");
      publishAt = d.toISOString();
    }

    const t = await youtubeUploadToken(g.user.id);
    if ("status" in t) return bad(youtubeStateMessage(t.status.state), 409, { youtubeState: t.status.state });

    const uploadUrl = await createYoutubeResumableSession({
      accessToken: t.token, title, description, categoryId, tags, privacyStatus: privacy, publishAt,
      contentLength: size, origin: request.headers.get("origin") ?? undefined,
    });
    return NextResponse.json({ uploadUrl }, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("유튜브 업로드 준비에 실패했습니다.")) {
      const quota = /quota|rateLimit|uploadLimitExceeded/i.test(e.message);
      console.error("[playlist youtube session]", e.message.slice(0, 300));
      return bad(quota ? "오늘 유튜브 업로드 한도(무료 할당량)를 다 썼습니다. 내일 다시 시도해 주세요." : "유튜브가 업로드 준비를 거절했습니다. 채널 상태(전화 인증·업로드 제한)를 확인한 뒤 다시 시도해 주세요.", 502);
    }
    console.error("[playlist youtube session]", e instanceof Error ? e.message.slice(0, 200) : "unknown");
    return bad("유튜브 업로드를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  }
}
