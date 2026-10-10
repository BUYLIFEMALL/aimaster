import { NextResponse } from "next/server";
import { authenticateExtension } from "@/lib/extensionBridge";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 확장 연결 확인(하트비트) · 작업 진행 여부 조회 · 연결 해제
export async function POST(req: Request) {
  try {
    const auth = await authenticateExtension(req);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { admin, userId, token } = auth;

    const body = await req.json().catch(() => ({}));

    if (body?.disconnect === true) {
      await admin.from("nba_extension_tokens").delete().eq("token", token).eq("user_id", userId);
      return NextResponse.json({ success: true });
    }

    await admin.from("nba_extension_tokens").update({ last_ping_at: new Date().toISOString() }).eq("token", token);

    if (typeof body?.id === "string" && body.id) {
      const { data } = await admin.from("nba_posts").select("status").eq("id", body.id).eq("user_id", userId).maybeSingle();
      // publishing만 진행 중. 웹에서 취소(draft 등)하면 확장이 중단한다.
      return NextResponse.json({ state: data?.status === "publishing" ? "running" : data?.status || "missing" });
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
