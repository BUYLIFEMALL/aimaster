import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { MAX_SAVED_B64, saveImported } from "@/lib/saved";
import { readResaveBody, resaveCors } from "@/lib/resaveReceiver";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

// v1.34: 이미지 변환 스튜디오 「4컷 보관함에 다시 저장」 — 변환한 그림 1장을 서버 보관함에 「그림만 있는 작품」으로 추가한다.
// CORS·본문 읽기·형식 판별은 공용 기준 코드 `resave-receiver`(이 프로그램이 기준). 보낸 쪽 이름표(label)가 있으면 제목 「○○ 3화 · WEBP」.
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: resaveCors(request.headers.get("origin")) });
}

export async function POST(request: NextRequest) {
  const res = await importPost(request);
  for (const [k, v] of Object.entries(resaveCors(request.headers.get("origin")))) res.headers.set(k, v);
  return res;
}

async function importPost(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const r = readResaveBody(await request.text(), MAX_SAVED_B64);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status, headers: NO_STORE });
  const saved = await saveImported(access.user.id, r.bytes, r.ext, r.label);
  if (!saved) return NextResponse.json({ error: "보관함에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ id: saved.id }, { headers: NO_STORE });
}
