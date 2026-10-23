import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { EditError, deleteEdit, loadEdit } from "@/lib/edit/edits";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const valid = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

/** 편집 하나 불러오기(회원 본인 것만) */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!valid(params.id)) return NextResponse.json({ error: "잘못된 편집 번호입니다." }, { status: 400 });
  try {
    return NextResponse.json(await loadEdit(user.id, params.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof EditError ? e.message : "편집을 불러오지 못했습니다." }, { status: e instanceof EditError ? e.status : 500 });
  }
}

/** 편집 삭제(음성·완성 영상 파일 포함) */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!valid(params.id)) return NextResponse.json({ error: "잘못된 편집 번호입니다." }, { status: 400 });
  try {
    await deleteEdit(user.id, params.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof EditError ? e.message : "편집을 지우지 못했습니다." }, { status: e instanceof EditError ? e.status : 500 });
  }
}
