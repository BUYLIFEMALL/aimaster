// 원본 화면이 부르는 /api/rpc/<이름>. 모든 명령은 AIMaster 로그인 + 이 프로그램 이용 권한을 확인한 뒤 실행한다.
import { after, NextResponse, type NextRequest } from "next/server";
import { trackMemberJobs } from "@/server/memberJobs";
import { afterRpc } from "@/server/memberScheduling";
import { checkProgramAccessApi } from "@/lib/access";
import { runRpc } from "@/server/runtime";
import { isReadOnlyMemberRpc } from "@/server/readOnlyRpcs";
import { memberFromUser } from "@/server/member";
import { createClient } from "@/lib/supabase/server";
import { loadMemberAiKeys } from "@/server/memberAiKeys";
import { withMemberAiKeys } from "@/litpage/server/ai/providers/config.ts";
import { warmModelLists } from "@/litpage/server/ai/models.ts";
import { koErrorBody } from "@/server/errorKo";
import { ACCOUNT_CHANGED_MESSAGE, ACCOUNT_CHANGED_NAME, EXPECTED_ACCOUNT_HEADER } from "@/lib/accountGuard";

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
    await (await createClient()).auth.signOut({ scope: "local" }); // 2026-11-13 공통: 이 기기만 로그아웃(docs/HANDOFF_20261113_LOGIN_POLICY_ROLLOUT.md)
    return NextResponse.json({}, { headers: { "Cache-Control": "private, no-store" } });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ name: access.status === 401 ? "UnauthorizedError" : "PermissionError", message: access.error }, { status: access.status });
  }
  // 2026-11-17 WS-20261117-17 QA017: 단독 화면이 기대한 계정(헤더)과 지금 로그인 회원이 다르면 명령·AI 키·외부 동작 전에 409.
  // 헤더가 없는 기존 호출은 그대로. 헤더는 인증 근거가 아니라 비교용(인가는 위 checkProgramAccessApi 그대로).
  const expected = request.headers.get(EXPECTED_ACCOUNT_HEADER);
  if (expected !== null && expected !== access.user.id) {
    return NextResponse.json({ name: ACCOUNT_CHANGED_NAME, message: ACCOUNT_CHANGED_MESSAGE }, { status: 409, headers: { "Cache-Control": "private, no-store" } });
  }
  const text = await request.text();
  if (text.length > MAX_JSON_BYTES) return NextResponse.json({ name: "ValidationError", message: "Request is too large" }, { status: 413 });
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ name: "ValidationError", message: "Invalid JSON" }, { status: 400 });
  }
  // 2026-11-20 WS-LECTURE-PREVIEW-ONLY A2: DB에 쓰지 않는 읽기 전용 명령(강의 일정 미리보기)은 인증·권한·계정 확인은 위와 같고,
  // 회원 AI 키 조회·모델 목록 예열(외부 호출)·정시 작업 추적·응답 뒤 afterRpc(쓰기 가능)를 하지 않는다. 다른 명령은 아래 그대로.
  if (isReadOnlyMemberRpc(name)) {
    const ro = await runRpc(name, body, memberFromUser(access.user), request.headers.get("x-lit-client-id") ?? undefined);
    return NextResponse.json(koErrorBody(ro.status, ro.body), { status: ro.status, headers: { "Cache-Control": "private, no-store" } });
  }
  // U3: 이 요청 동안(요청 뒤 이어지는 자동 채우기 포함) 회원 본인 AI 키만 쓴다. 키 확인 실패 시 AI만 꺼진 상태로 진행
  const aiKeys = await loadMemberAiKeys(access.user.id).catch(() => ({}));
  // U4: 회원 키의 모델 목록(Gemini·OpenAI)을 먼저 받아 둔다 — 모델 선택 창·자동 모델이 바로 맞게
  await withMemberAiKeys(aiKeys, () => warmModelLists()).catch(() => {});
  // U11: 명령 처리 중 회원 정시 작업(반복 자동화·리마인더)이 예약됐는지 함께 받는다
  const { result, scheduled } = await trackMemberJobs(() =>
    withMemberAiKeys(aiKeys, () => runRpc(name, body, memberFromUser(access.user), request.headers.get("x-lit-client-id") ?? undefined)),
  );
  // U11: 응답 뒤에도 값 변경 자동화를 끝까지 실행(서버리스에서 타이머가 사라지지 않게)하고, 필요하면 회원 cron-job.org 실행을 켠다
  const userId = access.user.id;
  after(() => withMemberAiKeys(aiKeys, () => afterRpc(userId, scheduled)));
  // 2026-11-13: 원본 서버 영어 오류 문구를 한국어로(src/server/errorKo.ts)
  return NextResponse.json(koErrorBody(result.status, result.body), { status: result.status, headers: { "Cache-Control": "private, no-store" } });
}
