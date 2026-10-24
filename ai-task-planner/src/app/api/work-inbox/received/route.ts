import { NextResponse, type NextRequest } from "next/server";
import { authorizePlanner, plannerFailure, NO_STORE } from "@/lib/planner/api";
import { loadWorkspace, commitWorkspace } from "@/lib/planner/repository";
import { applyCommand, PlannerError } from "@/lib/planner/engine";
import { RECEIVED_TARGET, receivedActionSchema, receivedTaskInput, type ReceivedRow } from "@/lib/planner/received";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// U8-B: 공용 받은편지함(work_inbox)에서 받는 곳이 할 일 플래너인 회원 본인 줄만 읽고 처리한다.
// 서버 키는 RLS를 건너뛰므로 모든 조회·수정에 user_id·target_slug 조건을 붙인다.
const COLUMNS = "id, source_slug, title, data, created_at";
const inbox = () => createAdminClient().from("work_inbox");

export async function GET() {
  try {
    const user = await authorizePlanner();
    const { data, error } = await inbox().select(COLUMNS)
      .eq("user_id", user.id).eq("target_slug", RECEIVED_TARGET).is("imported_at", null)
      .order("created_at", { ascending: true }).limit(50);
    if (error) throw new PlannerError("받은 할 일을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.", 503);
    return NextResponse.json({ items: data ?? [] }, { headers: NO_STORE });
  } catch (error) { return plannerFailure(error); }
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new PlannerError("요청 출처를 확인할 수 없습니다.", 403);
    const user = await authorizePlanner();
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > 2000) throw new PlannerError("입력 크기를 넘었습니다.", 413);
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { throw new PlannerError("입력 형식을 확인해주세요."); }
    const input = receivedActionSchema.parse(parsed);
    if (input.action === "discard") {
      const { error } = await inbox().delete().eq("user_id", user.id).eq("target_slug", RECEIVED_TARGET).eq("id", input.id);
      if (error) throw new PlannerError("버리지 못했습니다. 잠시 후 다시 시도해주세요.", 503);
      return NextResponse.json({ ok: true }, { headers: NO_STORE });
    }
    // 두 번 추가 막기: 아직 안 가져간 줄에만 먼저 「가져감」 표시 → 할 일 추가 → 실패하면 표시 되돌림
    const claimed = await inbox().update({ imported_at: new Date().toISOString() })
      .eq("user_id", user.id).eq("target_slug", RECEIVED_TARGET).eq("id", input.id).is("imported_at", null)
      .select(COLUMNS).maybeSingle();
    if (claimed.error) throw new PlannerError("받은 할 일을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.", 503);
    if (!claimed.data) throw new PlannerError("이미 추가했거나 지운 항목입니다. 목록을 새로 불러왔습니다.", 409);
    const release = () => inbox().update({ imported_at: null }).eq("user_id", user.id).eq("id", input.id);
    try {
      const record = await loadWorkspace(user.id);
      if (record.revision !== input.revision) throw new PlannerError("다른 화면에서 기록이 변경됐습니다. 최신 기록을 불러온 뒤 다시 추가해주세요.", 409);
      const taskId = crypto.randomUUID();
      const updated = applyCommand(record.workspace, { type: "task.add", input: receivedTaskInput(claimed.data as ReceivedRow, record.workspace, input.date) }, Date.now(), () => taskId);
      const saved = await commitWorkspace(user.id, record.revision, crypto.randomUUID(), updated);
      await inbox().update({ imported_ref: taskId }).eq("user_id", user.id).eq("id", input.id);
      return NextResponse.json({ workspace: saved.workspace, revision: saved.revision, userId: user.id, serverNow: Date.now() }, { headers: NO_STORE });
    } catch (e) {
      await release();
      throw e;
    }
  } catch (error) { return plannerFailure(error); }
}
