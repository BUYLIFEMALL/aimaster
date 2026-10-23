import { NextResponse } from "next/server";
import { authorize, rec, errorJson } from "@/lib/apiGuard";
import { RenderError, listRenders, startRender } from "@/lib/music/renders";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.22 완성본 보관 — GET 내 목록, POST 보관 시작(서명 업로드 주소). 회원 본인 것만.
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ renders: await listRenders(gate.auth.user.id) });
  } catch (err) {
    if (err instanceof RenderError) return errorJson(err.message, err.status);
    return errorJson("보관한 완성본을 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  try {
    const body = rec(await request.json());
    return NextResponse.json(await startRender(gate.auth.user.id, body));
  } catch (err) {
    if (err instanceof RenderError) return errorJson(err.message, err.status);
    return errorJson("보관을 시작하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
  }
}
