import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { MAX_TARGETS } from "@/lib/targets";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 확장 팝업 「이 단지 감시 추가」 — 단지 번호·이름만 받는다(매물 내용 없음).
// 10개 상한·중복은 화면과 같은 규칙이고, DB 트리거도 한 번 더 막는다.
export async function POST(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { complexNo?: unknown; complexName?: unknown } | null;
  const complexNo = String(body?.complexNo ?? "");
  const complexName = String(body?.complexName ?? "").trim().slice(0, 100) || null;
  if (!/^[0-9]{1,12}$/.test(complexNo)) return NextResponse.json({ error: "단지 번호가 올바르지 않습니다." }, { status: 400 });

  const supabase = createServiceClient();
  const { data: rows } = await supabase.from("realty_alert_targets").select("complex_no").eq("user_id", user.userId);
  const list = rows ?? [];
  if (list.some((r) => r.complex_no === complexNo)) return NextResponse.json({ error: "이미 감시 중인 단지예요." }, { status: 409 });
  if (list.length >= MAX_TARGETS) {
    return NextResponse.json({ error: `감시 대상은 최대 ${MAX_TARGETS}개까지예요. 웹에서 하나를 지워 주세요.` }, { status: 409 });
  }

  const { error } = await supabase.from("realty_alert_targets").insert({ user_id: user.userId, complex_no: complexNo, complex_name: complexName });
  if (error) {
    const msg = error.code === "23514" ? `감시 대상은 최대 ${MAX_TARGETS}개까지예요.` : error.code === "23505" ? "이미 감시 중인 단지예요." : "저장하지 못했습니다.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
  return NextResponse.json({ ok: true, count: list.length + 1 });
}
