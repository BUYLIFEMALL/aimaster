// 2026-11-13(플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md B-1, 주인님 「진행하고」) — U14 2단계 공개 REST API /v1.
// 회원이 자기 프로그램(스크립트·Make·n8n 등)에서 내 워크스페이스의 페이지·표·댓글을 읽고 쓴다.
// · 토큰 = 설정 → Workspace MCP에서 만드는 개인 토큰(lp_pat_…) 그대로(회원당 5개·90일 만료·토큰당 분당 60회 — MCP 서버와 같음).
// · 원본 publicApi(Hono)를 그대로 쓰고, 그 앞에서 토큰 주인 회원의 AIMaster 이용 권한을 확인한다(MCP 라우트와 같은 틀).
// · 계속 닫힌 것: 개발자용 연결·봇 토큰·공개 API 웹훅(dev* 명령 — 운영자 서버의 바깥 호출), 바깥 MCP 연결.
import { after, NextResponse, type NextRequest } from "next/server";
import { Hono } from "hono";
import { initRuntime } from "@/server/runtime";
import { withRequestCache } from "@/litpage/server/db.ts";
import { mcpTokenOwner } from "@/litpage/server/ai/litMcp.ts";
import { registerPublicApi } from "@/litpage/server/publicApi/routes.ts";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/access";
import { trackMemberJobs } from "@/server/memberJobs";
import { afterRpc } from "@/server/memberScheduling";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

let app: Hono | null = null;
function api(): Hono {
  if (!app) {
    app = new Hono();
    registerPublicApi(app);
  }
  return app;
}

const apiError = (status: number, code: string, message: string) =>
  NextResponse.json({ object: "error", status, code, message }, { status, headers: { "Cache-Control": "private, no-store" } });

async function handle(request: NextRequest): Promise<Response> {
  initRuntime();
  const authorization = request.headers.get("authorization") ?? undefined;
  const owner = withRequestCache(() => mcpTokenOwner(authorization));
  if (owner?.expired) return apiError(401, "unauthorized", "토큰이 만료됐습니다(발급 뒤 90일). 업무 워크스페이스 설정 → Workspace MCP에서 새 토큰을 만들어 주세요.");
  if (owner) {
    const access = await checkProgramAccess(createAdminClient() as unknown as Parameters<typeof checkProgramAccess>[0], owner.userId, THIS_PROGRAM_SLUG);
    if (!access.allowed) return apiError(403, "restricted_resource", "AI 업무 워크스페이스 이용 권한이 없습니다(이용 기간 종료 등). 메인 사이트에서 이용 권한을 확인해 주세요.");
  }
  // 토큰이 없거나 틀리면 원본이 401을 돌려준다
  const { result, scheduled } = await trackMemberJobs(() => withRequestCache(() => Promise.resolve(api().fetch(request))));
  if (owner) {
    const userId = owner.userId;
    after(() => afterRpc(userId, scheduled));
  }
  const headers = new Headers(result.headers);
  headers.set("Cache-Control", "private, no-store");
  return new Response(result.body, { status: result.status, headers });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
