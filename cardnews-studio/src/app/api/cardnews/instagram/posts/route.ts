import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberInstagramAccount, INSTA_CONNECT_URL } from "@/lib/instagram/memberAccount";
import { insertPost, ownProjectId, removeImages, validPaths } from "@/lib/instagram/posts";
import { MAX_PENDING_PER_USER, validateScheduleTime } from "@/lib/cardnews/schedule";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const COLUMNS = "id, project_id, title, page_count, status, scheduled_at, published_at, permalink, ig_username, error_message, created_at";

/** GET — 내 인스타 게시 기록(최근 30일, 최신순 30건). ?projectId= 이면 그 카드뉴스 기록만 */
export async function GET(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  let q = createAdminClient().from("cns_insta_posts").select(COLUMNS).eq("user_id", gate.auth.user.id).order("created_at", { ascending: false }).limit(30);
  if (projectId && /^[0-9a-f-]{36}$/i.test(projectId)) q = q.eq("project_id", projectId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "게시 기록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ posts: data ?? [] });
}

/** POST — 예약 게시 등록. 이미지는 미리 올려 둔 회원 폴더 경로(예약 시각까지 보관), 시각은 10분 뒤~60일 안 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const body = (await request.json().catch(() => ({}))) as { paths?: unknown; caption?: unknown; scheduledAt?: unknown; projectId?: unknown; title?: unknown };
  const paths = Array.isArray(body.paths) ? body.paths.filter((p): p is string => typeof p === "string") : [];
  const caption = typeof body.caption === "string" ? body.caption.slice(0, 2200) : "";
  const fail = async (error: string, status = 400, extra: Record<string, unknown> = {}) => {
    if (validPaths(userId, paths)) await removeImages(paths);
    return NextResponse.json({ error, ...extra }, { status });
  };
  if (!validPaths(userId, paths)) return NextResponse.json({ error: "예약할 이미지 정보가 올바르지 않습니다. 다시 시도해주세요." }, { status: 400 });
  if (!caption.trim()) return fail("게시 문구(캡션)를 입력해 주세요.");
  const when = validateScheduleTime(body.scheduledAt);
  if (!when.ok) return fail(when.error);
  const account = await getMemberInstagramAccount(userId);
  if (!account) return fail("연결된 인스타그램 계정이 없습니다. INSTA 포스팅 자동화에서 한 번 연결해 주세요.", 400, { connectUrl: INSTA_CONNECT_URL, needConnect: true });
  if (account.expired) return fail("인스타그램 연결이 만료되었습니다. INSTA 포스팅 자동화에서 다시 연결해 주세요.", 400, { connectUrl: INSTA_CONNECT_URL, needConnect: true });
  const { count } = await createAdminClient().from("cns_insta_posts").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "scheduled");
  if ((count ?? 0) >= MAX_PENDING_PER_USER) return fail(`대기 중인 예약이 ${MAX_PENDING_PER_USER}건이라 더 예약할 수 없습니다. 지난 예약이 게시되거나 취소한 뒤 다시 시도해 주세요.`);
  try {
    const projectId = await ownProjectId(userId, body.projectId);
    const id = await insertPost({ userId, projectId, title: typeof body.title === "string" ? body.title : "", paths, caption }, { status: "scheduled", scheduled_at: when.at.toISOString(), ig_username: account.username });
    return NextResponse.json({ success: true, id, scheduledAt: when.at.toISOString(), username: account.username });
  } catch {
    return fail("예약을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
  }
}

/** DELETE — 예약 취소(아직 게시 전인 내 예약만). 올려 둔 이미지도 지운다. */
export async function DELETE(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "취소할 예약을 찾지 못했습니다." }, { status: 400 });
  const { data } = await createAdminClient()
    .from("cns_insta_posts")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", gate.auth.user.id)
    .eq("status", "scheduled")
    .select("image_paths")
    .maybeSingle();
  if (!data) return NextResponse.json({ error: "이미 게시 중이거나 끝난 예약이라 취소할 수 없습니다." }, { status: 409 });
  await removeImages(data.image_paths ?? []);
  return NextResponse.json({ success: true });
}
