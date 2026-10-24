import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/chat/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatOnce, chatStream, embed, ROUTER_MODEL, type ChatMessage } from "@/lib/chat/upstage";
import { webSearch, type WebResult } from "@/lib/chat/tavily";
import { buildSources, extractKeywords, isSummaryQuestion, mergeHybrid, parseRouteDecision, pickDocHits, roomTitleFrom, todayKst, type ChunkHit, type DocHit } from "@/lib/chat/core";
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

  // 「이 문서만 참고」(U4): 내 문서가 맞을 때만
  let onlyDocumentId: string | null = null;
  if (useDocs && typeof body.documentId === "string" && UUID.test(body.documentId)) {
    const { data } = await admin.from("dcb_documents").select("id").eq("id", body.documentId).eq("user_id", userId).maybeSingle();
    if (!data) return NextResponse.json({ error: "선택한 문서를 찾지 못했습니다. 내 문서에서 다시 선택해 주세요." }, { status: 404 });
    onlyDocumentId = data.id as string;
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
        const docs: DocHit[] = useDocs ? await findDocHits(admin, userId, upstageKey!, question, onlyDocumentId) : [];
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

type Admin = ReturnType<typeof createAdminClient>;

/** 문서 앞부분 조각(요약·「이 문서만」 질문에서 관련도가 낮게 나올 때의 근거) */
async function firstChunks(admin: Admin, userId: string, documentId: string): Promise<DocHit[]> {
  const { data } = await admin.from("dcb_chunks").select("content, dcb_documents(name)").eq("document_id", documentId).eq("user_id", userId).order("chunk_index").limit(5);
  return (data ?? []).map((c) => ({ document_id: documentId, document_name: (c.dcb_documents as unknown as { name: string } | null)?.name ?? "문서", content: c.content as string, similarity: 0 }));
}

/** 내 문서에서 근거 찾기 — 벡터 + 키워드 혼합(L4), 「이 문서만」(U4), 요약 질문(L12) */
async function findDocHits(admin: Admin, userId: string, upstageKey: string, question: string, onlyDocumentId: string | null): Promise<DocHit[]> {
  const { count } = await admin.from("dcb_chunks").select("id", { count: "exact", head: true }).eq("user_id", userId);
  if (!count) return [];

  const [qv] = await embed(upstageKey, [question], "query");
  const { data: hits } = await admin.rpc("dcb_match_chunks", { p_user_id: userId, p_embedding: JSON.stringify(qv), p_count: onlyDocumentId ? 20 : 10 });
  const vectorHits = (hits ?? []) as ChunkHit[];

  if (onlyDocumentId) {
    const picked = pickDocHits(vectorHits, onlyDocumentId);
    return picked.length ? picked : firstChunks(admin, userId, onlyDocumentId);
  }

  // 키워드가 그대로 들어 있는 조각(이름·숫자·고유명사 보강)
  const keywords = extractKeywords(question);
  let keywordHits: ChunkHit[] = [];
  if (keywords.length) {
    const { data } = await admin
      .from("dcb_chunks")
      .select("id, document_id, content, dcb_documents(name)")
      .eq("user_id", userId)
      .or(keywords.map((k) => `content.ilike.%${k}%`).join(","))
      .limit(30);
    keywordHits = (data ?? []).map((c) => ({
      id: c.id as string,
      document_id: c.document_id as string,
      document_name: (c.dcb_documents as unknown as { name: string } | null)?.name ?? "문서",
      content: c.content as string,
      similarity: vectorHits.find((v) => v.id === c.id)?.similarity ?? 0,
    }));
  }
  const merged = mergeHybrid(vectorHits, keywordHits, keywords);
  if (merged.length) return merged;

  // 요약 질문인데 근거가 없으면 가장 가까운 문서의 앞부분으로 답한다
  if (isSummaryQuestion(question) && vectorHits[0]?.document_id) return firstChunks(admin, userId, vectorHits[0].document_id);
  return [];
}
