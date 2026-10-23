import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteAsyncParse, getAsyncParse } from "@/lib/chat/upstage";
import { IngestError, ingestText } from "@/lib/chat/ingest";
import { checkDocLimits } from "@/lib/chat/uploadChecks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/**
 * POST { requestId, name, size } — 100쪽 넘는 문서의 Upstage 비동기 읽기(L3) 상태를 확인한다.
 * 끝났으면 결과 글을 조각·임베딩해 저장하고 Upstage의 결과를 지운다. 회원 본인 키로만 조회하므로 남의 요청은 볼 수 없다.
 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const body = (await request.json().catch(() => ({}))) as { requestId?: unknown; name?: unknown; size?: unknown };
  const requestId = typeof body.requestId === "string" && /^[A-Za-z0-9_-]{6,100}$/.test(body.requestId) ? body.requestId : "";
  if (!requestId) return NextResponse.json({ error: "확인할 요청을 찾지 못했습니다." }, { status: 400 });
  const name = String(body.name ?? "").slice(0, 200) || "문서";
  const size = Number(body.size) || 0;

  const up = await requireOwnKey(userId, "upstage");
  if (!up.ok) return up.response;

  try {
    const st = await getAsyncParse(up.apiKey, requestId);
    if (st.status === "pending") return NextResponse.json({ status: "pending", totalPages: st.totalPages, completedPages: st.completedPages });
    if (st.status === "failed") return NextResponse.json({ status: "failed", error: st.failure }, { status: 200 });

    const admin = createAdminClient();
    const limit = await checkDocLimits(admin, userId, name, size);
    if (limit) {
      // 화면이 같은 요청을 두 번 확인해 이미 저장된 경우 — 완료로 본다
      const j = (await limit.clone().json().catch(() => ({}))) as { duplicate?: boolean };
      if (j.duplicate) {
        await deleteAsyncParse(up.apiKey, requestId);
        return NextResponse.json({ status: "done", alreadySaved: true });
      }
      return limit;
    }
    const document = await ingestText({ admin, userId, apiKey: up.apiKey, name, sizeBytes: size, text: st.text ?? "" });
    await deleteAsyncParse(up.apiKey, requestId);
    return NextResponse.json({ status: "done", document, totalPages: st.totalPages });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || "큰 문서 상태를 확인하지 못했습니다." }, { status: err instanceof IngestError ? err.status : 502 });
  }
}
