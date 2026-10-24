import test from "node:test";
import assert from "node:assert/strict";
import { A, B, BOT, ROOM, draft, context, request, route } from "./helpers/bot-route-harness.mjs";
const chat = await route("app/api/chat/route.ts");
const rooms = await route("app/api/rooms/[id]/route.ts");
const bots = await route("app/api/bots/route.ts");
const ctx = { params: Promise.resolve({ id: ROOM }) };
const body = { message: "시험 질문", useDocs: false, web: "off" };
const room = (user_id = A, bot_ref = null) => ({ id: ROOM, title: "방", user_id, bot_ref });
const bot = (user_id = A, extra = {}) => ({ ...draft, id: BOT, user_id, revision: 1, ...extra });
async function events(response) { return (await response.text()).trim().split("\n").map((line) => JSON.parse(line)); }

test("모든 새 봇 API와 방 선택·채팅은 로그인 없으면 차단", async () => {
  const c = context(); c.authorized = false;
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) assert.equal((await bots[method](method === "GET" ? new Request("http://local.test/api/bots") : request(method, {}))).status, 401);
  assert.equal((await rooms.PATCH(request("PATCH", { botRef: "preset-summary" }), ctx)).status, 401);
  assert.equal((await chat.POST(request("POST", body))).status, 401);
  assert.equal(c.ai.length, 0);
});
test("기존 일반 채팅 기본값·NDJSON 계약 유지, 실제 모델 기록", async () => {
  const c = context();
  const response = await chat.POST(request("POST", body));
  assert.equal(response.status, 200);
  const ev = await events(response);
  assert.deepEqual(ev.map((e) => e.type), ["meta", "delta", "done"]);
  assert.equal(c.ai[0].temperature, 0.3);
  assert.equal(c.ai[0].key, "A-own-key");
  assert.equal(ev[2].generationContext.bot, null);
  assert.equal(c.db.tables.dcb_messages.find((r) => r.role === "assistant").generation_context.model, "solar-pro4");
});
test("기본 봇 선택은 서버 설정·온도로 실행, 가짜 지침/다른 회원 키 무시", async () => {
  const c = context();
  const ev = await events(await chat.POST(request("POST", { ...body, botRef: "preset-summary", botRevision: 1, provider: "nvidia", model: "forged-model", instructions: "가짜 지침", user_id: B })));
  assert.equal(ev.at(-1).type, "done");
  assert.equal(c.ai[0].kind, "upstage");
  assert.equal(c.ai[0].temperature, 0.2);
  assert.match(c.ai[0].messages[0].content, /핵심 요약/);
  assert.ok(!c.ai[0].messages[0].content.includes("가짜 지침"));
  assert.equal(c.ai[0].key, "A-own-key");
  assert.equal(c.db.tables.dcb_rooms[0].bot_ref, "preset-summary");
  assert.equal(c.db.tables.dcb_messages.at(-1).generation_context.bot.id, "preset-summary");
});
test("내 봇 수정이 과거 메시지 설정을 바꾸지 않고 재열기에서 유지", async () => {
  const c = context({ dcb_bots: [bot()], dcb_rooms: [room(A, BOT)] });
  await events(await chat.POST(request("POST", { ...body, roomId: ROOM })));
  c.db.tables.dcb_bots[0].name = "변경된 이름";
  c.db.tables.dcb_bots[0].instructions = "새 지침";
  c.db.tables.dcb_bots[0].revision = 2;
  const data = await (await rooms.GET(new Request("http://local.test"), ctx)).json();
  assert.equal(data.room.bot_ref, BOT);
  assert.equal(data.messages.at(-1).generation_context.bot.name, draft.name);
  assert.equal(data.messages.at(-1).generation_context.bot.instructions, draft.instructions);
});
test("방의 봇 선택·해제를 저장해 재열기, 타 회원 방은 변경하지 않음", async () => {
  const c = context({ dcb_rooms: [room()] });
  assert.equal((await rooms.PATCH(request("PATCH", { botRef: "preset-work" }), ctx)).status, 200);
  assert.equal((await (await rooms.GET(new Request("http://local.test"), ctx)).json()).room.bot_ref, "preset-work");
  assert.equal((await rooms.PATCH(request("PATCH", { botRef: null }), ctx)).status, 200);
  assert.equal(c.db.tables.dcb_rooms[0].bot_ref, null);
  c.db.tables.dcb_rooms[0].user_id = B;
  assert.equal((await rooms.PATCH(request("PATCH", { botRef: "preset-work" }), ctx)).status, 404);
  assert.equal((await chat.POST(request("POST", { ...body, roomId: ROOM }))).status, 404);
  assert.equal(c.ai.length, 0);
});
test("타 회원/삭제/종료/변경 버전 봇은 AI·대화 쓰기 전에 거절", async () => {
  for (const [seed, expected, revision] of [[bot(B), 404, 1], [null, 404, 1], [bot(A, { model: "retired" }), 400, 1], [bot(A, { revision: 2 }), 409, 1]]) {
    const c = context({ dcb_bots: seed ? [seed] : [] });
    const response = await chat.POST(request("POST", { ...body, botRef: BOT, botRevision: revision }));
    assert.equal(response.status, expected);
    assert.equal(c.ai.length, 0);
    assert.equal(c.db.tables.dcb_rooms.length, 0);
    assert.equal(c.db.tables.dcb_messages.length, 0);
  }
});
test("본인 기존 키가 없으면 다른 회원 키로 대신 호출하지 않음", async () => {
  const c = context(); delete c.keys[A].upstage;
  const response = await chat.POST(request("POST", { ...body, botRef: "preset-summary" }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).needApiKey, true);
  assert.equal(c.ai.length, 0);
  assert.equal(c.db.tables.dcb_messages.length, 0);
});
test("내 새 공급자 봇의 온도·공용 키·실제 응답 모델 기록", async () => {
  const c = context({ dcb_bots: [bot(A, { provider: "groq", model: "openai/gpt-oss-20b", temperature: 0.8 })], user_api_keys: [{ user_id: A, provider: "groq", api_key: "A-groq" }, { user_id: B, provider: "groq", api_key: "B-groq" }] });
  const ev = await events(await chat.POST(request("POST", { ...body, botRef: BOT })));
  assert.equal(c.ai[0].apiKey, "A-groq");
  assert.equal(c.ai[0].temperature, 0.8);
  assert.equal(ev.at(-1).generationContext.model, "actual-server-model");
  assert.equal(c.db.tables.dcb_messages.at(-1).generation_context.model, "actual-server-model");
});
test("질문 저장 실패는 AI 미호출, 답변 저장 실패는 done을 반환하지 않음", async () => {
  const c = context();
  c.db.fail = (table, mode, value) => table === "dcb_messages" && mode === "insert" && value.role === "user";
  assert.equal((await chat.POST(request("POST", body))).status, 500);
  assert.equal(c.ai.length, 0);
  c.db.fail = (table, mode, value) => table === "dcb_messages" && mode === "insert" && value.role === "assistant";
  const ev = await events(await chat.POST(request("POST", body)));
  assert.equal(ev.at(-1).type, "error");
  assert.ok(!ev.some((e) => e.type === "done"));
});
