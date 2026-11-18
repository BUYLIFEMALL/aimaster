import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteHistory, getHistory, postHistory } from "@/lib/historyStore";
import { loadRetentionExemptIdsStrict } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.20 작업 히스토리를 회원 계정에 저장 — 표 aif_history(본인 읽기만, 쓰기는 이 서버만) + 비공개 버킷 aif-history.
// 회원당 최근 30개, 생성 30일 지나면 목록을 불러올 때 지운다. 플랜 docs/PLAN_20261020_HISTORY_DB.md
// 2026-11-18 W01b: 보관 연장·열외 회원(retention_exempt)은 자동 삭제 제외, 예외 확인 실패 시 자동 삭제 안 함 — 처리 로직은 src/lib/historyStore.ts

function deps(userId: string) {
  const admin = createAdminClient();
  return { admin, userId, loadExemptIds: () => loadRetentionExemptIdsStrict(admin) };
}

/** GET — 내 히스토리(최근 30개, 이미지는 1시간 서명 주소) */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const r = await getHistory(deps(access.user.id));
  return NextResponse.json(r.body, { status: r.status });
}

/** POST — 히스토리 한 건 저장. body: { image: "data:image/jpeg;base64,…", captions: string[], config: object, summary: string } */
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await request.json().catch(() => null);
  const r = await postHistory(deps(access.user.id), body);
  return NextResponse.json(r.body, { status: r.status });
}

/** DELETE — ?id=한 건 / ?all=1 전체 */
export async function DELETE(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const url = new URL(request.url);
  const r = await deleteHistory(deps(access.user.id), { id: url.searchParams.get("id"), all: url.searchParams.get("all") === "1" });
  return NextResponse.json(r.body, { status: r.status });
}
