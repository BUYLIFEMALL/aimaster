import { NextResponse } from "next/server";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { EditError, listEdits, saveEdit } from "@/lib/edit/edits";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** 내 편집 목록 */
export async function GET() {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  try {
    return NextResponse.json({ edits: await listEdits(user.id) }, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ error: e instanceof EditError ? e.message : "편집 목록을 불러오지 못했습니다." }, { status: e instanceof EditError ? e.status : 500 });
  }
}

/** 편집 저장(새로 만들기·고치기) — 응답의 uploads로 브라우저가 음성·완성 영상을 회원 폴더에 바로 올린다 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const body = await request.json().catch(() => ({}));
  try {
    const saved = await saveEdit(user.id, body);
    await logProgramUsage(user.id, body.video ? "edit_save_video" : "edit_save", 1, { clips: saved.project.clips.length });
    return NextResponse.json(saved, { headers: NO_STORE });
  } catch (e) {
    return NextResponse.json({ error: e instanceof EditError ? e.message : "편집을 저장하지 못했습니다." }, { status: e instanceof EditError ? e.status : 500 });
  }
}
