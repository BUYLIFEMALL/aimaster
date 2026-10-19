import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberInstagramAccount, INSTA_CONNECT_URL } from "@/lib/instagram/memberAccount";
import { graphBaseFor, publishInstagramCarousel, publishInstagramPost } from "@/lib/instagram/publish";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

const MAX_CAPTION = 2200; // 인스타그램 캡션 한도

/** POST — 회원 본인 인스타그램 계정에 카드뉴스를 바로 게시한다(1장=피드, 2~10장=캐러셀). 게시 뒤 임시 이미지는 지운다. */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const body = (await request.json().catch(() => ({}))) as { paths?: unknown; caption?: unknown };
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];
  const caption = typeof body.caption === "string" ? body.caption.slice(0, MAX_CAPTION) : "";
  const prefix = `${userId}/insta/`;
  if (paths.length < 1 || paths.length > 10 || paths.some((p) => !p.startsWith(prefix) || p.includes("..") || !/\.jpg$/.test(p))) {
    return NextResponse.json({ error: "게시할 이미지 정보가 올바르지 않습니다. 다시 시도해주세요." }, { status: 400 });
  }

  const storage = createAdminClient().storage.from("cardnews-images");
  const cleanup = () => storage.remove(paths).catch(() => undefined);

  const account = await getMemberInstagramAccount(userId);
  if (!account) {
    await cleanup();
    return NextResponse.json({ error: "연결된 인스타그램 계정이 없습니다. INSTA 포스팅 자동화에서 한 번 연결하면 여기서도 바로 쓸 수 있어요.", connectUrl: INSTA_CONNECT_URL, needConnect: true }, { status: 400 });
  }
  if (account.expired) {
    await cleanup();
    return NextResponse.json({ error: "인스타그램 연결이 만료되었습니다. INSTA 포스팅 자동화에서 다시 연결해 주세요.", connectUrl: INSTA_CONNECT_URL, needConnect: true }, { status: 400 });
  }

  const imageUrls = paths.map((p) => storage.getPublicUrl(p).data.publicUrl);
  try {
    const base = { graphBase: graphBaseFor(account.authMethod), accessToken: account.accessToken, igUserId: account.igUserId, caption };
    const result = imageUrls.length === 1
      ? await publishInstagramPost({ ...base, imageUrl: imageUrls[0] })
      : await publishInstagramCarousel({ ...base, imageUrls });
    return NextResponse.json({ success: true, permalink: result.permalink, username: account.username });
  } catch (err) {
    const msg = String((err as Error)?.message ?? "").replace(account.accessToken, "***").slice(0, 300);
    console.error("cardnews instagram publish error:", msg);
    return NextResponse.json({ error: `인스타그램 게시에 실패했습니다. ${msg}` }, { status: 502 });
  } finally {
    await cleanup();
  }
}
