import { NextResponse } from "next/server";
import { authorize, requireOwnKey } from "@/lib/chat/apiGuard";
import { getUserApiKey } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatOnce, chatStream, embed, ROUTER_MODEL, type ChatMessage } from "@/lib/chat/upstage";
import { webSearch, type WebResult } from "@/lib/chat/tavily";
import { buildRouterPrompt, buildSources, buildSystemPrompt, MIN_DOC_SIMILARITY, parseRouteDecision, roomTitleFrom, todayKst, type DocHit } from "@/lib/chat/core";

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
  const body = (await request.json().catch(() => ({}))) as { roomId?: unknown; message?: unknown; useDocs?: unknown; web?: unknown };
  const question = typeof body.message === "string" ? body.message.trim().slice(0, MAX_QUESTION) : "";
  if (!question) return NextResponse.json({ error: "질문을 입력해 주세요." }, { status: 400 });
  const useDocs = body.useDocs !== false;
  const webMode = body.web === "off" ? "off" : "auto";

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
        let docs: DocHit[] = [];
        if (useDocs) {
          const { count } = await admin.from("dcb_chunks").select("id", { count: "exact", head: true }).eq("user_id", userId);
          if ((count ?? 0) > 0) {
            const [qv] = await embed(upstageKey, [question], "query");
            const { data: hits } = await admin.rpc("dcb_match_chunks", { p_user_id: userId, p_embedding: JSON.stringify(qv), p_count: 5 });
            docs = ((hits ?? []) as DocHit[]).filter((h) => h.similarity >= MIN_DOC_SIMILARITY);
          }
        }

        // 2) 웹 검색이 필요한지 판단 → 필요하면 Tavily(MCP) 검색
        let web: WebResult[] = [];
        let webNote: string | null = null;
        if (webMode === "auto") {
          if (!tavilyKey) {
            webNote = "no_key";
          } else {
            // 문서에서 찾은 내용을 함께 보여 주어, 문서로 답할 수 있으면 웹 검색을 건너뛴다(L9)
            const decision = parseRouteDecision(await chatOnce(upstageKey, ROUTER_MODEL, [{ role: "user", content: buildRouterPrompt(question, today, docs) }], 160), question);
            if (decision.web) {
              try {
                web = (await webSearch(tavilyKey, decision.query, 5, { topic: decision.topic, timeRange: decision.timeRange })).results;
                webNote = "searched";
              } catch (err) {
                webNote = `error:${(err as Error).message}`;
              }
            }
          }
        }

        const sources = buildSources(docs, web);
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
