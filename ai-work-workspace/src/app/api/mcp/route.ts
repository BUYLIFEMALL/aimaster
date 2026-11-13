// 2026-11-13(플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-4, 주인님 「권장안대로」) — MCP 서버 1단계:
// 회원이 자기 워크스페이스를 Claude Desktop·Cursor 같은 외부 AI 도구에서 읽고 쓰게 한다.
// 원본 /api/mcp(aiStream.ts의 Hono 라우트)와 같은 규칙에, AIMaster 이용 권한(토큰 주인 회원)을 먼저 확인한다.
// 로그인 쿠키 없이 개인 토큰(Authorization: Bearer lp_pat_…, 설정 → Workspace MCP에서 발급)으로만 들어온다.
// 한도(회원당 토큰 5개·90일 만료·토큰당 분당 60회)는 원본 litMcp.ts에 얹었다. 바깥 MCP 연결(에이전트가 남의 MCP를 부르는 것)은 계속 닫혀 있다.
import { after, NextResponse, type NextRequest } from "next/server";
import { initRuntime } from "@/server/runtime";
import { withRequestCache } from "@/litpage/server/db.ts";
import { handleMcpHttp, mcpTokenOwner } from "@/litpage/server/ai/litMcp.ts";
import { withMemberAiKeys } from "@/litpage/server/ai/providers/config.ts";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/access";
import { loadMemberAiKeys } from "@/server/memberAiKeys";
import { trackMemberJobs } from "@/server/memberJobs";
import { afterRpc } from "@/server/memberScheduling";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "private, no-store" };
const rpcError = (status: number, code: number, message: string, headers: Record<string, string> = {}) =>
  NextResponse.json({ jsonrpc: "2.0", id: null, error: { code, message } }, { status, headers: { ...NO_STORE, ...headers } });

export async function POST(request: NextRequest) {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) return rpcError(415, -32700, "Expected application/json");
  const text = await request.text();
  if (text.length > 1024 * 1024) return rpcError(413, -32600, "Request is too large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return rpcError(400, -32700, "Parse error");
  }
  initRuntime();
  const authorization = request.headers.get("authorization") ?? undefined;
  const owner = withRequestCache(() => mcpTokenOwner(authorization));
  if (owner?.expired) {
    return rpcError(401, -32001, "MCP 토큰이 만료됐습니다(발급 뒤 90일). 업무 워크스페이스 설정 → Workspace MCP에서 새 토큰을 만들어 주세요.", { "www-authenticate": 'Bearer realm="Workspace MCP"' });
  }
  if (owner) {
    const access = await checkProgramAccess(createAdminClient() as unknown as Parameters<typeof checkProgramAccess>[0], owner.userId, THIS_PROGRAM_SLUG);
    if (!access.allowed) return rpcError(403, -32003, "AI 업무 워크스페이스 이용 권한이 없습니다(이용 기간 종료 등). 메인 사이트에서 이용 권한을 확인해 주세요.");
  }
  // 토큰이 없거나 틀리면 원본이 401을 돌려준다. 맞으면 토큰 주인 회원 본인 AI 키로만 처리한다(운영자 키 폴백 없음)
  const aiKeys = owner ? await loadMemberAiKeys(owner.userId).catch(() => ({})) : {};
  const { result: r, scheduled } = await trackMemberJobs(() =>
    withMemberAiKeys(aiKeys, () => withRequestCache(() => handleMcpHttp(authorization, body, request.headers.get("mcp-session-id") ?? undefined))),
  );
  if (owner) {
    const userId = owner.userId;
    after(() => withMemberAiKeys(aiKeys, () => afterRpc(userId, scheduled)));
  }
  const headers = { ...NO_STORE, ...(r.headers ?? {}) };
  if (r.body === undefined) return new NextResponse(null, { status: r.status, headers });
  return NextResponse.json(r.body, { status: r.status, headers });
}

export function GET() {
  return new NextResponse(null, { status: 405, headers: { allow: "POST" } });
}
