import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getMemberInstagramAccount, INSTA_CONNECT_URL } from "@/lib/instagram/memberAccount";
import { MAX_INSTA_CAPTION, validInstaPaths } from "@/lib/instagram/slides";
import { ALREADY_POSTED_NOTE, fetchRecentMedia, insertPost, publishPaths, removeImages } from "@/lib/instagram/posting";
import { FIRST_ATTEMPT_MARGIN_MS, findSameRecentPost, isTransientPublishError } from "@/lib/instagram/schedule";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** POST — 회원 본인 인스타그램 계정에 바로 게시(1장=피드, 2~10장=캐러셀)하고 게시 기록에 남긴다(v1.16). 성공·실패와 관계없이 임시 사진은 지운다. */
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const userId = access.user.id;
  const startedAt = Date.now();
  const body = (await request.json().catch(() => ({}))) as { paths?: unknown; caption?: unknown };
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];
  const caption = typeof body.caption === "string" ? body.caption.slice(0, MAX_INSTA_CAPTION) : "";
  if (!validInstaPaths(userId, paths)) {
    return NextResponse.json({ error: "게시할 사진 정보가 올바르지 않습니다. 다시 시도해주세요." }, { status: 400 });
  }
  try {
    let out = await publishPaths(userId, paths, caption);
    if (!out.ok && out.needConnect) return NextResponse.json({ error: out.error, connectUrl: INSTA_CONNECT_URL, needConnect: true }, { status: 400 });
    // 일시 오류로 실패했으면 다시 누르기 전에 이미 올라갔는지 확인한다(카드뉴스 v1.23과 같음) — 버튼을 누른 시각 이후 같은 캡션만 같은 글로 본다
    let alreadyPosted = false;
    if (!out.ok && isTransientPublishError(out.error)) {
      const same = findSameRecentPost((await fetchRecentMedia(userId)) ?? [], caption, Date.now(), startedAt + FIRST_ATTEMPT_MARGIN_MS);
      if (same) {
        out = { ok: true, permalink: same.permalink ?? "", username: (await getMemberInstagramAccount(userId))?.username ?? "" };
        alreadyPosted = true;
      }
    }
    await insertPost({ userId, paths, caption }, out.ok
      ? { status: "published", published_at: new Date().toISOString(), permalink: out.permalink || null, ig_username: out.username, error_message: alreadyPosted ? ALREADY_POSTED_NOTE : null }
      : { status: "failed", error_message: out.error }).catch((e) => console.error("insta post record error:", String(e?.message ?? "").slice(0, 200)));
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: 502 });
    return NextResponse.json({ success: true, permalink: out.permalink, username: out.username, alreadyPosted });
  } finally {
    await removeImages(paths);
  }
}
