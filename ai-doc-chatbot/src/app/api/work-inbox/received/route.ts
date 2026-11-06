import { NextResponse } from "next/server";
import { authorize } from "@/lib/chat/apiGuard";
import { listReceivedWorkInbox, markWorkInboxImported } from "@/lib/workInbox";
import { THIS_PROGRAM_SLUG } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// U9-D: 업무 워크스페이스에서 보낸 문서(공용 표 work_inbox, target_slug = ai-doc-chatbot). 항상 로그인 회원 본인 줄만.
// GET = 가져가지 않은 문서 목록(제목만)
// POST { id, action: "open" } = 본문만 돌려줌(화면이 .md 파일로 만들어 기존 「문서 올리기」로 색인)
// POST { id, action: "done", ref } = 색인이 끝난 뒤 가져감으로 표시
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  try {
    const items = await listReceivedWorkInbox(gate.auth.user.id, THIS_PROGRAM_SLUG);
    return NextResponse.json({ items: items.map(({ id, title, sourceSlug, createdAt }) => ({ id, title, sourceSlug, createdAt })) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "받은 문서를 읽지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  try {
    const { id, action, ref } = (await request.json()) as { id?: unknown; action?: unknown; ref?: unknown };
    const items = await listReceivedWorkInbox(userId, THIS_PROGRAM_SLUG, { includeImported: true, limit: 100 });
    const item = items.find((i) => i.id === id);
    if (!item) return NextResponse.json({ error: "받은 문서를 찾을 수 없습니다." }, { status: 404 });
    if (action === "done") {
      await markWorkInboxImported(userId, THIS_PROGRAM_SLUG, item.id, typeof ref === "string" ? ref : "doc-chatbot-document");
      return NextResponse.json({ success: true });
    }
    if (!item.bodyMd.trim()) return NextResponse.json({ error: "받은 문서에 본문이 없습니다." }, { status: 400 });
    return NextResponse.json({ title: item.title, bodyMd: item.bodyMd });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "받은 문서를 가져오지 못했습니다." }, { status: 400 });
  }
}
