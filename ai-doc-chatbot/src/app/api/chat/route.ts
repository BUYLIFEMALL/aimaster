import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/chat/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatOnce, chatStream, embed, ROUTER_MODEL, type ChatMessage } from "@/lib/chat/upstage";
import { webSearch, type WebResult } from "@/lib/chat/tavily";
import { buildSources, parseRouteDecision, roomTitleFrom, todayKst, type DocHit } from "@/lib/chat/core";
import { documentSelection } from "@/lib/chat/documentRules";
import { resolveDocumentScope } from "@/lib/chat/documents";
import { findDocumentHits } from "@/lib/chat/documentSearch";
import { buildAnswerMessages, buildRouterMessages, needsWebDecision } from "@/lib/chat/prompts";
import { compatibleCredentials } from "@/lib/compatibleChat/keyStore";
import { compatibleChat } from "@/lib/compatibleChat/transport";
import { CompatibleChatError } from "@/lib/compatibleChat/config";
import { generationContext, UUID } from "@/lib/bots/core";
import { resolveBot } from "@/lib/bots/store";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const MAX_QUESTION = 4000;
const HISTORY_TURNS = 10;

/** POST — 질문 하나에 답한다. 응답은 한 줄에 JSON 하나씩(meta → delta… → done | error) 흘려보낸다 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const input: unknown = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "질문 요청을 확인해 주세요." }, { status: 400 });
  const body = input as Record<string, unknown>;
  const question = typeof body.message === "string" ? body.message.trim().slice(0, MAX_QUESTION) : "";
  if (!question) return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
  const useDocs = body.useDocs !== false;
  const webMode = body.web === "off" ? "off" : "auto";
  const regenerate = body.regenerate === true;

  const admin = createAdminClient();
  let selectedDocumentIds: string[] | null = null;
  let documentIds: string[] = [];
  try {
    if (useDocs) {
      selectedDocumentIds = documentSelection(body);
      documentIds = await resolveDocumentScope(admin, userId, selectedDocumentIds);
    }
  } catch (e) { return NextResponse.json({ error: e instanceof CompatibleChatError ? e.message : "참고 문서를 확인하지 못했습니다." }, { status: e instanceof CompatibleChatError ? e.status : 500 }); }
  let roomId: string | null = null;
  let savedBotRef: string | null = null;
  if (body.roomId !== undefined && body.roomId !== null) {
    if (typeof body.roomId !== "string" || !UUID.test(body.roomId)) return NextResponse.json({ error: "채팅방을 다시 선택해 주세요." }, { status: 400 });
    const { data, error } = await admin.from("dcb_rooms").select("id,bot_ref").eq("id", body.roomId).eq("user_id", userId).maybeSingle();
    if (error) return NextResponse.json({ error: "채팅방을 확인하지 못했습니다." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 404 });
    roomId = data.id; savedBotRef = data.bot_ref;
  }
  let bot: Awaited<ReturnType<typeof resolveBot>>;
  try { bot = await resolveBot(admin, userId, body.botRef === undefined ? savedBotRef : body.botRef, body.botRevision); }
  catch (error) { return NextResponse.json({ error: error instanceof CompatibleChatError ? error.message : "봇 설정을 확인하지 못했습니다." }, { status: error instanceof CompatibleChatError ? error.status : 500 }); }
  // 봇 설정은 회원 소유 DB/공개 기본 설정에서만 가져온다. 요청 본문의 가짜 모델·지침을 적용하지 않는다.
  const provider = bot?.provider ?? (body.provider === undefined ? "upstage" : body.provider);
  const model = bot?.model ?? body.model;
  const legacy = provider === "upstage";
  if (legacy && model !== undefined && model !== "solar-pro4") return NextResponse.json({ error: "기존 Solar 답변 모델을 다시 선택해 주세요." }, { status: 400 });
  let upstageKey: string | undefined;
  if (legacy || useDocs) {
    const up = await requireOwnKey(userId, "upstage");
    if (!up.ok) return up.response;
    upstageKey = up.apiKey;
  }
  const tavilyKey = webMode === "auto" ? await getUserApiKey(userId, "tavily") : null;

  let credentials: Awaited<ReturnType<typeof compatibleCredentials>> | null = null;
  if (!legacy) {
    try { credentials = await compatibleCredentials(admin, userId, provider, model); }
    catch (error) { return NextResponse.json({ error: error instanceof CompatibleChatError ? error.message : "AI 연결 정보를 확인하지 못했습니다.", needApiKey: error instanceof CompatibleChatError && error.needApiKey }, { status: error instanceof CompatibleChatError ? error.status : 500 }); }
  }

  const selection = { provider: credentials?.provider ?? "upstage", model: credentials?.model ?? "solar-pro4", temperature: bot?.temperature ?? 0.3 };
  const context = generationContext(selection, bot);
  const botRef = bot?.id ?? null;
  // 본인 키·봇 검증을 마친 뒤에만 방과 질문을 저장한다.
  if (!roomId) {
    const { data, error } = await admin.from("dcb_rooms").insert({ user_id: userId, title: roomTitleFrom(question), bot_ref: botRef }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "채팅방을 만들지 못했습니다." }, { status: 500 });
    roomId = data.id as string;
  } else if (botRef !== savedBotRef) {
    const { error } = await admin.from("dcb_rooms").update({ bot_ref: botRef }).eq("id", roomId).eq("user_id", userId);
    if (error) return NextResponse.json({ error: "채팅방의 봇 선택을 저장하지 못했습니다." }, { status: 500 });
  }

  // 다시 생성(U3): 마지막 질문·답변이 같은 질문이면 지우고 새로 답한다
  if (regenerate) {
    const { data: last } = await admin.from("dcb_messages").select("id, role, content").eq("room_id", roomId).eq("user_id", userId).order("created_at", { ascending: false }).limit(2);
    if (last?.length === 2 && last[0].role === "assistant" && last[1].role === "user" && last[1].content === question) {
      await admin.from("dcb_messages").delete().in("id", [last[0].id, last[1].id]).eq("user_id", userId);
    }
  }

  const { data: historyRows } = await admin
    .from("dcb_messages")
    .select("role, content")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_TURNS * 2);
  const history: ChatMessage[] = (historyRows ?? []).reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));

  const { error: questionError } = await admin.from("dcb_messages").insert({ room_id: roomId, user_id: userId, role: "user", content: question, generation_context: context });
  if (questionError) return NextResponse.json({ error: "질문을 저장하지 못했습니다. AI를 호출하지 않았습니다." }, { status: 500 });

  const today = todayKst();
  const encoder = new TextEncoder();
  const cancel = new AbortController();
  const signal = AbortSignal.any([request.signal, cancel.signal]);
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => { if (!signal.aborted) controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n")); };
      try {
        // 1) 내 문서에서 관련 내용 찾기
        const docs: DocHit[] = documentIds.length ? await findDocumentHits(admin, userId, (await embed(upstageKey!, [question], "query"))[0], question, documentIds, selectedDocumentIds !== null) : [];
        signal.throwIfAborted();

        // 2) 웹 검색이 필요한지 판단 → 필요하면 Tavily(MCP) 검색
        let web: WebResult[] = [];
        let webNote: string | null = null;
        let webVia: "mcp" | "rest" | undefined;
        if (webMode === "auto" && needsWebDecision(bot)) {
          if (!tavilyKey) {
            webNote = "no_key";
          } else {
            // 문서에서 찾은 내용을 함께 보여 주어, 문서로 답할 수 있으면 웹 검색을 건너뛴다(L9)
            const routerMessages = buildRouterMessages(question, today, docs, bot);
            const raw = credentials
              ? (await compatibleChat({ ...credentials, messages: routerMessages, temperature: 0, maxTokens: 512, timeoutMs: 15_000, signal })).text
              : await chatOnce(upstageKey!, ROUTER_MODEL, routerMessages, 160, signal);
            const decision = parseRouteDecision(raw, question);
            if (decision.web) {
              try {
                const outcome = await webSearch(tavilyKey, decision.query, 5, { topic: decision.topic, timeRange: decision.timeRange });
                web = outcome.results;
                webVia = outcome.via;
                webNote = "searched";
              } catch (err) {
                webNote = `error:${(err as Error).message}`;
              }
            }
          }
        }

        const sources = buildSources(docs, web, webVia);
        send({ type: "meta", roomId, sources, webNote, botRef, generationContext: context });

        // 3) 답변(실시간으로 흘려보냄)
        const messages = buildAnswerMessages(today, docs, web, bot, history, question);
        signal.throwIfAborted();
        const result = credentials
          ? await compatibleChat({ ...credentials, messages, temperature: selection.temperature, signal, onDelta: (text) => send({ type: "delta", text }) })
          : { text: await chatStream(upstageKey!, messages, (text) => send({ type: "delta", text }), signal, selection.temperature), model: "solar-pro4" };
        const answer = result.text;
        signal.throwIfAborted();

        const finalContext = generationContext(selection, bot, result.model);
        const { data: saved, error: saveError } = await admin
          .from("dcb_messages")
          .insert({ room_id: roomId, user_id: userId, role: "assistant", content: answer || "(빈 답변)", sources, generation_context: finalContext })
          .select("id, created_at")
          .single();
        if (saveError || !saved) throw new CompatibleChatError("답변을 받았지만 저장하지 못했습니다. 자동으로 재호출하지 않았습니다.", 500);
        await admin.from("dcb_rooms").update({ updated_at: new Date().toISOString() }).eq("id", roomId).eq("user_id", userId);
        send({ type: "done", messageId: saved.id, createdAt: saved.created_at, model: result.model, provider: selection.provider, generationContext: finalContext });
      } catch (err) {
        send({ type: "error", roomId, error: (err as Error).message || "답변을 만들지 못했습니다.", needApiKey: err instanceof CompatibleChatError && err.needApiKey });
      } finally {
        if (!signal.aborted) controller.close();
      }
    },
    cancel() { cancel.abort(); },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
