import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { INSTA_CONNECT_URL } from "@/lib/instagram/memberAccount";
import { insertPost, ownProjectId, publishPaths, removeImages, validPaths } from "@/lib/instagram/posts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const MAX_CAPTION = 2200; // 인스타그램 캡션 한도

/** POST — 회원 본인 인스타그램 계정에 카드뉴스를 바로 게시하고 게시 기록에 남긴다(1장=피드, 2~10장=캐러셀). 게시 뒤 임시 이미지는 지운다. */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const body = (await request.json().catch(() => ({}))) as { paths?: unknown; caption?: unknown; projectId?: unknown; title?: unknown };
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];
  const caption = typeof body.caption === "string" ? body.caption.slice(0, MAX_CAPTION) : "";
  if (!validPaths(userId, paths)) return NextResponse.json({ error: "게시할 이미지 정보가 올바르지 않습니다. 다시 시도해주세요." }, { status: 400 });

  try {
    const out = await publishPaths(userId, paths, caption);
    if (!out.ok && out.needConnect) return NextResponse.json({ error: out.error, connectUrl: INSTA_CONNECT_URL, needConnect: true }, { status: 400 });
    const projectId = await ownProjectId(userId, body.projectId);
    const title = typeof body.title === "string" ? body.title : "";
    await insertPost({ userId, projectId, title, paths, caption }, out.ok
      ? { status: "published", published_at: new Date().toISOString(), permalink: out.permalink, ig_username: out.username }
      : { status: "failed", error_message: out.error }).catch((e) => console.error("insta post record error:", String(e?.message ?? "").slice(0, 200)));
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: 502 });
    return NextResponse.json({ success: true, permalink: out.permalink, username: out.username });
  } finally {
    await removeImages(paths);
  }
}
