import { NextResponse } from "next/server";
import { authorize, errorJson } from "@/lib/apiGuard";
import { RenderError, deleteRender } from "@/lib/music/renders";
import { isRenderId } from "@/lib/music/renderArchive";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.22 보관한 완성본 지우기(회원 본인 것만)
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await params;
  if (!isRenderId(id)) return errorJson("잘못된 요청입니다.", 400);
  try {
    await deleteRender(gate.auth.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof RenderError) return errorJson(err.message, err.status);
    return errorJson("지우지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
  }
}
