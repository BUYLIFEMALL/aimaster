import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { MAX_SAVED_B64, deleteAllSaved, deleteSaved, listSaved, saveImage } from "@/lib/saved";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** 서버 보관함 목록(서명된 임시 주소, 1시간) */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  return NextResponse.json({ items: await listSaved(access.user.id) }, { headers: NO_STORE });
}

/** 회원이 보관함 저장을 켠 경우에만 호출된다. 생성 결과 1장을 비공개 버킷에 저장한다(원본 사진은 받지 않는다). */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const raw = await request.text();
  if (raw.length > MAX_SAVED_B64 + 2_000) return NextResponse.json({ error: "이미지가 너무 큽니다." }, { status: 413, headers: NO_STORE });
  let body: { image?: { data?: unknown; mimeType?: unknown }; purposeLabel?: unknown; aspect?: unknown; model?: unknown } = {};
  try { body = JSON.parse(raw); } catch { /* 아래에서 처리 */ }
  const img = body.image;
  if (!img || typeof img.data !== "string" || typeof img.mimeType !== "string") return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400, headers: NO_STORE });
  if (!["image/jpeg", "image/png", "image/webp"].includes(img.mimeType)) return NextResponse.json({ error: "지원하지 않는 이미지 형식입니다." }, { status: 400, headers: NO_STORE });
  if (img.data.length < 100 || img.data.length > MAX_SAVED_B64 || !B64.test(img.data)) return NextResponse.json({ error: "이미지 데이터가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const saved = await saveImage(access.user.id, {
    base64: img.data, mimeType: img.mimeType, purposeLabel: str(body.purposeLabel), aspect: str(body.aspect), model: str(body.model),
  });
  if (!saved) return NextResponse.json({ error: "보관함에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ id: saved.id }, { headers: NO_STORE });
}

/** ?id=<id> 한 장 삭제, ?all=1 전체 삭제 */
export async function DELETE(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  if (request.nextUrl.searchParams.get("all") === "1") {
    const n = await deleteAllSaved(access.user.id);
    return NextResponse.json({ success: true, deleted: n }, { headers: NO_STORE });
  }
  const ok = await deleteSaved(access.user.id, request.nextUrl.searchParams.get("id") ?? "");
  if (!ok) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}
