import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { listReceivedWorkInbox, markWorkInboxImported } from "@/lib/workInbox";
import { PROGRAM_SLUG } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// U9-B: 업무 워크스페이스에서 보낸 원고(공용 표 work_inbox, target_slug = ai-slide-builder).
// GET = 가져가지 않은 원고 목록(제목만), POST { id } = 그 원고 본문을 돌려주고 가져감으로 표시. 항상 로그인 회원 본인 줄만.
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed || !access.user) {
    return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
  }
  try {
    const items = await listReceivedWorkInbox(access.user.id, PROGRAM_SLUG);
    return NextResponse.json({ items: items.map(({ id, title, sourceSlug, createdAt }) => ({ id, title, sourceSlug, createdAt })) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "받은 원고를 읽지 못했습니다." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed || !access.user) {
    return NextResponse.json({ error: access.error }, { status: access.status ?? 401 });
  }
  try {
    const { id } = (await req.json()) as { id?: unknown };
    const items = await listReceivedWorkInbox(access.user.id, PROGRAM_SLUG, { includeImported: true, limit: 100 });
    const item = items.find((i) => i.id === id);
    if (!item) return NextResponse.json({ error: "받은 원고를 찾을 수 없습니다." }, { status: 404 });
    await markWorkInboxImported(access.user.id, PROGRAM_SLUG, item.id, "slide-source");
    return NextResponse.json({ title: item.title, bodyMd: item.bodyMd });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "받은 원고를 가져오지 못했습니다." }, { status: 400 });
  }
}
