import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKeys, isKeyProvider } from "@/lib/apiKeys";
import { testProviderKey } from "@/lib/keyTest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

// 연결 확인: 회원 본인 키로 모델 목록만 조회(생성 요청 없음)
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403, headers: NO_STORE });
  let body: { target?: unknown } = {};
  try { body = await request.json(); } catch { /* 아래에서 처리 */ }
  if (!isKeyProvider(body.target)) return NextResponse.json({ error: "확인할 연결을 선택해 주세요." }, { status: 400, headers: NO_STORE });
  const key = (await getUserApiKeys(access.user.id, [body.target]))[body.target];
  if (!key) return NextResponse.json({ error: "먼저 키를 등록해 주세요." }, { status: 400, headers: NO_STORE });
  const r = await testProviderKey(body.target, key);
  return NextResponse.json(r.ok ? { ok: true, message: r.message } : { error: r.message }, { status: r.ok ? 200 : 400, headers: NO_STORE });
}
