// 원본 화면이 부르는 /api/rpc/<이름>. 모든 명령은 AIMaster 로그인 + 이 프로그램 이용 권한을 확인한 뒤 실행한다.
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { runRpc } from "@/server/runtime";
import { memberFromUser } from "@/server/member";
import { createClient } from "@/lib/supabase/server";
import { loadMemberAiKeys } from "@/server/memberAiKeys";
import { withMemberAiKeys } from "@/litpage/server/ai/providers/config.ts";
import { warmModelLists } from "@/litpage/server/ai/models.ts";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_JSON_BYTES = 20 * 1024 * 1024;

export async function POST(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  // 다른 사이트에서 보낸 요청 차단(원본 app.ts와 같은 규칙): JSON만 받는다
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return NextResponse.json({ name: "ValidationError", message: "Expected application/json" }, { status: 415 });
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ name: "PermissionError", message: "Cross-site request blocked" }, { status: 403 });
  }
  if (name === "signOut") {
    // 로그아웃은 AIMaster 통합 로그인(Supabase 세션)을 끝낸다 — 원본 자체 세션 쿠키는 쓰지 않는다
    await (await createClient()).auth.signOut();
    return NextResponse.json({}, { headers: { "Cache-Control": "private, no-store" } });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ name: access.status === 401 ? "UnauthorizedError" : "PermissionError", message: access.error }, { status: access.status });
  }
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) return NextResponse.json({ name: "ValidationError", message: "Request is too large" }, { status: 413 });
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ name: "ValidationError", message: "Invalid JSON" }, { status: 400 });
  }
  // U3: 이 요청 동안(요청 뒤 이어지는 자동 채우기 포함) 회원 본인 AI 키만 쓴다. 키 확인 실패 시 AI만 꺼진 상태로 진행
  const aiKeys = await loadMemberAiKeys(access.user.id).catch(() => ({}));
  // U4: 회원 키의 모델 목록(Gemini·OpenAI)을 먼저 받아 둔다 — 모델 선택 창·자동 모델이 바로 맞게
  await withMemberAiKeys(aiKeys, () => warmModelLists()).catch(() => {});
  const result = await withMemberAiKeys(aiKeys, () => runRpc(name, body, memberFromUser(access.user), request.headers.get("x-lit-client-id") ?? undefined));
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "private, no-store" } });
}
