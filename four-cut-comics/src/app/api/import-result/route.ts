import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { MAX_SAVED_B64, saveImported } from "@/lib/saved";
import { detectImageExt } from "@/lib/comic/savedIndex";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

// v1.34: 이미지 변환 스튜디오 「4컷 보관함에 다시 저장」 — 변환한 그림 1장을 서버 보관함에 「그림만 있는 작품」으로 추가한다.
// 그 주소만, 회원 본인 로그인 쿠키(.buylife.xyz)로 POST 허용. AI 호출 없음.
const IMPORT_ORIGIN = "https://image-convert-studio.buylife.xyz";
function cors(request: NextRequest): Record<string, string> {
  return request.headers.get("origin") === IMPORT_ORIGIN
    ? { "Access-Control-Allow-Origin": IMPORT_ORIGIN, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", Vary: "Origin" }
    : {};
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: cors(request) });
}

export async function POST(request: NextRequest) {
  const res = await importPost(request);
  for (const [k, v] of Object.entries(cors(request))) res.headers.set(k, v);
  return res;
}

async function importPost(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const raw = await request.text();
  if (raw.length > MAX_SAVED_B64 + 2_000) return NextResponse.json({ error: "이미지가 너무 큽니다." }, { status: 413, headers: NO_STORE });
  let body: { image?: { data?: unknown } } = {};
  try { body = JSON.parse(raw); } catch { /* 아래에서 처리 */ }
  const data = body.image?.data;
  if (typeof data !== "string" || data.length < 100 || data.length > MAX_SAVED_B64 || !B64.test(data)) {
    return NextResponse.json({ error: "이미지 데이터가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
  }
  const buf = Buffer.from(data, "base64");
  const ext = detectImageExt(buf);
  if (!ext) return NextResponse.json({ error: "JPEG·PNG·WebP 그림만 저장할 수 있습니다." }, { status: 400, headers: NO_STORE });
  const saved = await saveImported(access.user.id, buf, ext);
  if (!saved) return NextResponse.json({ error: "보관함에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ id: saved.id }, { headers: NO_STORE });
}
