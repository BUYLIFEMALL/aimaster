// U3: 원본 화면이 부르는 POST /api/ai/stream (Server-Sent Events). 원본 src/litpage/server/aiStream.ts와 같은 순서·같은
// 이벤트(meta·status·sources·step·changes·delta·done·ping)로 응답하되, 로그인은 AIMaster 통합 계정 + 이 프로그램 이용 권한,
// AI 키는 회원 본인 키(user_api_keys)만 쓴다. 맞춤 에이전트(kind: 'agent')는 U12 전까지 닫는다.
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { memberFromUser } from "@/server/member";
import { readyMember } from "@/server/runtime";
import { hasMemberAiKey, loadMemberAiKeys } from "@/server/memberAiKeys";
import { withMemberAiKeys } from "@/litpage/server/ai/providers/config.ts";
import { withRequestCache } from "@/litpage/server/db.ts";
import { mapError, NO_KEY_MESSAGE } from "@/litpage/server/ai/client.ts";
import { executeChatTurn, executeSimple, parseChatParams, prepareAiBlock, prepareChatTurn, prepareWriter, type TurnEvents } from "@/litpage/server/ai/service.ts";
import { messageJson } from "@/litpage/server/api/modules/ai.ts";
import { AI_RATE_MESSAGE, aiAllowed } from "@/litpage/server/ratelimit.ts";
import { STAGE_MESSAGE } from "@/server/stagePolicy";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

const NO_STORE = { "Cache-Control": "private, no-store" };
type Job = (ev: TurnEvents, signal: AbortSignal) => Promise<Record<string, unknown>>;

export async function POST(request: NextRequest) {
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return NextResponse.json({ name: "ValidationError", message: "Expected application/json" }, { status: 415 });
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ name: "PermissionError", message: "Cross-site request blocked" }, { status: 403 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ name: access.status === 401 ? "UnauthorizedError" : "PermissionError", message: access.error }, { status: access.status });
  }
  const text = await request.text();
  if (text.length > 2 * 1024 * 1024) return NextResponse.json({ name: "ValidationError", message: "Request is too large" }, { status: 413 });
  let body: any;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ name: "ValidationError", message: "Invalid JSON" }, { status: 400 });
  }

  const userId = access.user.id;
  // 회원 본인 키만 — 없으면 다른 키로 대신하지 않고 등록 안내(화면은 code: no_key를 보고 안내 상자를 띄움)
  const keys = await loadMemberAiKeys(userId).catch(() => ({}));
  if (!hasMemberAiKey(keys)) return NextResponse.json({ name: "AiNotConfigured", code: "no_key", message: NO_KEY_MESSAGE }, { status: 400, headers: NO_STORE });
  if (!aiAllowed(userId)) return NextResponse.json({ name: "AiError", code: "rate_limited", message: AI_RATE_MESSAGE }, { status: 429, headers: NO_STORE });

  const kind = String(body?.kind ?? "");
  if (kind === "agent") return NextResponse.json({ name: "PermissionError", message: STAGE_MESSAGE }, { status: 403, headers: NO_STORE });

  // 준비 단계(권한 확인·대화 만들기)는 요청 캐시 안에서, 오래 걸리는 생성은 캐시 밖에서(오래된 값을 읽지 않게)
  let job: Job;
  let meta: Record<string, unknown> = {};
  try {
    const member = await readyMember(memberFromUser(access.user));
    const clientId = request.headers.get("x-lit-client-id") ?? undefined;
    const prepared = withMemberAiKeys(keys, () => withRequestCache(() => {
      if (kind === "chat") {
        const prep = prepareChatTurn(parseChatParams(member.id, { ...body, clientId }));
        meta = { threadId: prep.thread.id, title: prep.thread.title, userMessageId: prep.userMessage?.id ?? null, truncated: prep.truncated };
        return (async (ev, signal) => {
          const r = await executeChatTurn(prep, ev, signal);
          return { status: r.status, text: r.message?.data.text ?? "", message: r.message ? messageJson(r.message) : null, error: r.error ?? null, threadId: r.threadId, title: r.title ?? null };
        }) as Job;
      }
      if (kind === "writer") {
        const req = prepareWriter({ ...body, userId: member.id });
        return (async (ev, signal) => ({ ...(await executeSimple("writer", req, ev, signal)) })) as Job;
      }
      if (kind === "block") {
        const req = prepareAiBlock({ userId: member.id, blockId: String(body?.blockId ?? ""), prompt: body?.prompt, output: body?.output, mentions: body?.mentions, search: !!body?.search, sources: typeof body?.sources === "string" ? body.sources : undefined });
        return (async (ev, signal) => ({ ...(await executeSimple("block", req, ev, signal)) })) as Job;
      }
      return null;
    }));
    if (!prepared) return NextResponse.json({ name: "ValidationError", message: `Unknown AI request kind "${kind}"` }, { status: 400 });
    job = prepared;
  } catch (e) {
    const err = mapError(e);
    return NextResponse.json({ name: "AiError", code: err.code, message: err.message }, { status: err.status === 499 ? 400 : err.status, headers: NO_STORE });
  }

  const encoder = new TextEncoder();
  const ac = new AbortController();
  request.signal.addEventListener("abort", () => ac.abort());
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (event: string, data: unknown) => {
        if (closed || ac.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };
      // 오래 생각하거나 승인을 기다릴 때 연결이 끊기지 않게
      const ping = setInterval(() => send("ping", {}), 15_000);
      try {
        send("meta", meta);
        const result = await withMemberAiKeys(keys, () => job({
          status: (s) => send("status", s),
          sources: (sources) => send("sources", { sources }),
          text: (t) => send("delta", { text: t }),
          step: (s) => send("step", s),
          changes: (ch) => send("changes", ch),
        }, ac.signal));
        send("done", result);
      } catch (err) {
        const e = mapError(err);
        send("done", { status: "error", text: "", error: { code: e.code, message: e.message } });
      } finally {
        clearInterval(ping);
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      ac.abort();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "private, no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
