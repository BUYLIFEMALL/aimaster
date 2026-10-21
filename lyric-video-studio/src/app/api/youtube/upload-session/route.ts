import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { UserError } from "@/lib/errors";
import { youtubeStateMessage, youtubeUploadToken } from "@/lib/youtube/account";
import { createYoutubeResumableSession } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PRIVACY = ["private", "unlisted", "public"] as const;
const CATEGORIES = ["10", "24", "22"]; // 음악·엔터테인먼트·인물/블로그(가사 영상용)
const MAX_BYTES = 2 * 1024 * 1024 * 1024;

// v1.04 유튜브 업로드 주소 만들기(shorts-onestop-studio에서 복사) — 영상 파일은 서버를 거치지 않고 브라우저가 이 주소로 바로 보낸다(Vercel 요청 4.5MB 한도).
// 접근 토큰은 돌려주지 않는다(업로드 주소는 이 영상 한 개에만 쓸 수 있음). 실제 올리기는 회원이 버튼을 눌렀을 때만.
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 40_000); if (g instanceof NextResponse) return g;
    const b = g.body;
    const title = String(b.title ?? "").replace(/[<>]/g, "").trim();
    if (!title) throw new UserError(400, "영상 제목을 넣어 주세요.");
    if (title.length > 100) throw new UserError(400, "유튜브 제목은 100자까지입니다.");
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
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) throw new UserError(400, "영상 파일 크기를 확인할 수 없습니다. MP4를 다시 만들어 주세요.");
    let publishAt: string | null = null;
    if (b.publishAt) {
      const d = new Date(String(b.publishAt));
      if (Number.isNaN(d.getTime())) throw new UserError(400, "예약 공개 시각이 올바르지 않습니다.");
      if (d.getTime() < Date.now() + 15 * 60_000) throw new UserError(400, "예약 공개는 지금부터 15분 뒤 이후로 정해 주세요.");
      publishAt = d.toISOString();
    }

    const accountId = typeof b.accountId === "string" && /^[0-9a-f-]{36}$/i.test(b.accountId) ? b.accountId : null; // v1.08 고른 채널(회원 본인 채널만)
    const t = await youtubeUploadToken(g.userId, accountId);
    if ("status" in t) throw new UserError(409, youtubeStateMessage(t.status.state), { youtubeState: t.status.state });

    const uploadUrl = await createYoutubeResumableSession({
      accessToken: t.token, title, description, categoryId, tags, privacyStatus: privacy, publishAt,
      contentLength: size, origin: request.headers.get("origin") ?? undefined,
    });
    return json({ uploadUrl });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("유튜브 업로드 준비에 실패했습니다.")) {
      const quota = /quota|rateLimit|uploadLimitExceeded/i.test(e.message);
      console.error("[lyric-video-studio] youtube session", e.message.slice(0, 300));
      return json({ error: quota ? "오늘 유튜브 업로드 한도(무료 할당량)를 다 썼습니다. 내일 다시 시도해 주세요." : "유튜브가 업로드 준비를 거절했습니다. 채널 상태(전화 인증·업로드 제한)를 확인한 뒤 다시 시도해 주세요." }, 502);
    }
    return fail(e);
  }
}
