import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { MAX_SAVED_B64, deleteAllSaved, deleteSaved, listSaved, normalizeRetention, saveImage } from "@/lib/saved";
import { readResaveBody, resaveCors } from "@/lib/resaveReceiver";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };
// v1.40: 이미지 변환 스튜디오 「인물사진 보관함에 다시 저장」 — CORS·본문 읽기·형식 판별은 공용 기준 코드 `resave-receiver` 사본
// (src/lib/resaveReceiver.ts, 기준 4컷 — 직접 고치지 않음). 2026-10-22부터 보낸 쪽이 적은 mimeType 대신 파일 첫 바이트로 형식 판별.
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: resaveCors(request.headers.get("origin")) });
}

/** 서버 보관함 목록(서명된 임시 주소, 1시간) */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  return NextResponse.json({ items: await listSaved(access.user.id) }, { headers: NO_STORE });
}

/** 회원이 보관함 저장을 켠 경우에만 호출된다. 생성 결과 1장을 비공개 버킷에 저장한다(원본 사진은 받지 않는다). */
export async function POST(request: NextRequest) {
  const res = await savePost(request);
  for (const [k, v] of Object.entries(resaveCors(request.headers.get("origin")))) res.headers.set(k, v);
  return res;
}

async function savePost(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const r = readResaveBody(await request.text(), MAX_SAVED_B64);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status, headers: NO_STORE });
  const body = r.body as { image: { data: string }; purposeLabel?: unknown; aspect?: unknown; model?: unknown; retentionDays?: unknown };
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const saved = await saveImage(access.user.id, {
    base64: body.image.data, mimeType: r.mime, purposeLabel: str(body.purposeLabel), aspect: str(body.aspect), model: str(body.model), retentionDays: normalizeRetention(body.retentionDays),
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
