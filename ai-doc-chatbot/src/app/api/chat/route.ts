import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/chat/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatOnce, chatStream, embed, ROUTER_MODEL, type ChatMessage } from "@/lib/chat/upstage";
import { webSearch, type WebResult } from "@/lib/chat/tavily";
import { buildRouterPrompt, buildSources, buildSystemPrompt, extractKeywords, isSummaryQuestion, mergeHybrid, parseRouteDecision, pickDocHits, roomTitleFrom, todayKst, type ChunkHit, type DocHit } from "@/lib/chat/core";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

const MAX_QUESTION = 4000;
const HISTORY_TURNS = 10;
const UUID = /^[0-9a-f-]{36}$/i;

/** POST — 질문 하나에 답한다. 응답은 한 줄에 JSON 하나씩(meta → delta… → done | error) 흘려보낸다 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const userId = gate.auth.user.id;
  const body = (await request.json().catch(() => ({}))) as { roomId?: unknown; message?: unknown; useDocs?: unknown; web?: unknown; documentId?: unknown; regenerate?: unknown };
  const question = typeof body.message === "string" ? body.message.trim().slice(0, MAX_QUESTION) : "";
  if (!question) return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
  const useDocs = body.useDocs !== false;
  const webMode = body.web === "off" ? "off" : "auto";
  const regenerate = body.regenerate === true;

  const up = await requireOwnKey(userId, "upstage");
  if (!up.ok) return up.response;
  const upstageKey = up.apiKey;
  const tavilyKey = webMode === "auto" ? await getUserApiKey(userId, "tavily") : null;

  const admin = createAdminClient();

  // 채팅방: 내 방이 맞는지 확인하거나 새로 만든다
  let roomId = typeof body.roomId === "string" && UUID.test(body.roomId) ? body.roomId : null;
  if (roomId) {
    const { data } = await admin.from("dcb_rooms").select("id").eq("id", roomId).eq("user_id", userId).maybeSingle();
    if (!data) roomId = null;
  }
  if (!roomId) {
    const { data, error } = await admin.from("dcb_rooms").insert({ user_id: userId, title: roomTitleFrom(question) }).select("id").single();
    if (error || !data) return NextResponse.json({ error: "채팅방을 만들지 못했습니다." }, { status: 500 });
    roomId = data.id as string;
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

  await admin.from("dcb_messages").insert({ room_id: roomId, user_id: userId, role: "user", content: question });

  const today = todayKst();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        // 1) 내 문서에서 관련 내용 찾기
        const docs: DocHit[] = useDocs ? await findDocHits(admin, userId, upstageKey, question, onlyDocumentId) : [];

        // 2) 웹 검색이 필요한지 판단 → 필요하면 Tavily(MCP) 검색
        let web: WebResult[] = [];
        let webNote: string | null = null;
        let webVia: "mcp" | "rest" | undefined;
        if (webMode === "auto") {
          if (!tavilyKey) {
            webNote = "no_key";
          } else {
            // 문서에서 찾은 내용을 함께 보여 주어, 문서로 답할 수 있으면 웹 검색을 건너뛴다(L9)
            const decision = parseRouteDecision(await chatOnce(upstageKey, ROUTER_MODEL, [{ role: "user", content: buildRouterPrompt(question, today, docs) }], 160), question);
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
        send({ type: "meta", roomId, sources, webNote });

        // 3) 답변(실시간으로 흘려보냄)
        const messages: ChatMessage[] = [{ role: "system", content: buildSystemPrompt(today, docs, web) }, ...history, { role: "user", content: question }];
        const answer = await chatStream(upstageKey, messages, (text) => send({ type: "delta", text }));

        const { data: saved } = await admin
          .from("dcb_messages")
          .insert({ room_id: roomId, user_id: userId, role: "assistant", content: answer || "(빈 답변)", sources })
          .select("id, created_at")
          .single();
        await admin.from("dcb_rooms").update({ updated_at: new Date().toISOString() }).eq("id", roomId).eq("user_id", userId);
        send({ type: "done", messageId: saved?.id ?? null, createdAt: saved?.created_at ?? null });
      } catch (err) {
        send({ type: "error", roomId, error: (err as Error).message || "답변을 만들지 못했습니다." });
      } finally {
        controller.close();
      }
    },
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
