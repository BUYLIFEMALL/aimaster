import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { INSTA_CONNECT_URL } from "@/lib/instagram/memberAccount";
import { MAX_INSTA_CAPTION, validInstaPaths } from "@/lib/instagram/feed";
import { publishPaths, removeImages } from "@/lib/instagram/posting";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** POST — 회원 본인 인스타그램 계정에 바로 게시(1장=피드, 2~10장=캐러셀). 성공·실패와 관계없이 임시 사진은 지운다. */
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const userId = access.user.id;
  const body = (await request.json().catch(() => ({}))) as { paths?: unknown; caption?: unknown };
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];
  const caption = typeof body.caption === "string" ? body.caption.slice(0, MAX_INSTA_CAPTION) : "";
  if (!validInstaPaths(userId, paths)) {
    return NextResponse.json({ error: "게시할 사진 정보가 올바르지 않습니다. 다시 시도해주세요." }, { status: 400 });
  }
  try {
    const out = await publishPaths(userId, paths, caption);
    if (!out.ok && out.needConnect) return NextResponse.json({ error: out.error, connectUrl: INSTA_CONNECT_URL, needConnect: true }, { status: 400 });
    if (!out.ok) return NextResponse.json({ error: out.error }, { status: 502 });
    return NextResponse.json({ success: true, permalink: out.permalink, username: out.username });
  } finally {
    await removeImages(paths);
  }
}
