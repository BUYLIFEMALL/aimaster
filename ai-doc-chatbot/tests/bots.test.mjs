import test from "node:test";
import assert from "node:assert/strict";
import { PRESET_BOTS, botDraft, botReference, generationContext, withBotInstructions } from "../src/lib/bots/core.ts";
import { createBot, deleteBot, listBots, resolveBot, updateBot } from "../src/lib/bots/store.ts";
import { A, B, BOT, draft, database } from "./helpers/bot-route-harness.mjs";
const row = (user_id = A, extra = {}) => ({ ...draft, id: BOT, user_id, revision: 1, ...extra });

test("기본 봇 3종과 일반 채팅 해제, 알 수 없는 참조 차단", () => {
  assert.equal(PRESET_BOTS.length, 3);
  assert.equal(botReference(null), null);
  assert.equal(botReference("preset-summary"), "preset-summary");
  for (const ref of [undefined, "preset-forged", "http://localhost", { id: BOT }]) assert.throws(() => botReference(ref));
});
test("공급자/모델·온도·글자 수를 서버에서 검증", () => {
  assert.deepEqual(botDraft(draft), draft);
  for (const patch of [{ name: " " }, { name: "가".repeat(61) }, { instructions: "가".repeat(6001) }, { temperature: NaN }, { temperature: -0.1 }, { temperature: 1.1 }, { temperature: "0.3" }, { provider: "nvidia" }, { model: "retired-model" }, { provider: "openrouter", model: "paid/model" }]) assert.throws(() => botDraft({ ...draft, ...patch }));
  assert.equal(botDraft({ ...draft, temperature: 0 }).temperature, 0);
  assert.equal(botDraft({ ...draft, temperature: 1 }).temperature, 1);
});
test("생성·조회·수정·삭제가 다른 회원 봇에 영향 없음", async () => {
  const store = database({ dcb_bots: [row(B)] });
  const made = await createBot(store, A, { ...draft, user_id: B, id: BOT });
  assert.notEqual(made.id, BOT);
  assert.equal(store.tables.dcb_bots.find((r) => r.id === made.id).user_id, A);
  assert.equal((await listBots(store, A)).bots.length, 1);
  assert.equal((await listBots(store, B)).bots[0].id, BOT);
  const changed = await updateBot(store, A, made.id, { ...draft, name: "변경" }, 1);
  assert.equal(changed.revision, 2);
  await deleteBot(store, A, made.id, 2);
  assert.deepEqual(store.tables.dcb_bots, [row(B)]);
});
test("타 회원 ID는 읽기/수정/삭제 모두 404, 기본 봇 직접 수정 금지", async () => {
  const store = database({ dcb_bots: [row(B)] });
  await assert.rejects(resolveBot(store, A, BOT), { status: 404 });
  await assert.rejects(updateBot(store, A, BOT, draft, 1), { status: 404 });
  await assert.rejects(deleteBot(store, A, BOT, 1), { status: 404 });
  await assert.rejects(updateBot(store, A, "preset-summary", draft, 1), { status: 400 });
  assert.deepEqual(store.tables.dcb_bots, [row(B)]);
});
test("오래된 수정·삭제·실행 버전은 409, 최신 변경 보존", async () => {
  const store = database({ dcb_bots: [row()] });
  await updateBot(store, A, BOT, { ...draft, name: "먼저 저장" }, 1);
  await assert.rejects(updateBot(store, A, BOT, { ...draft, name: "나중 덮기" }, 1), { status: 409 });
  await assert.rejects(deleteBot(store, A, BOT, 1), { status: 409 });
  await assert.rejects(resolveBot(store, A, BOT, 1), { status: 409 });
  assert.equal(store.tables.dcb_bots[0].name, "먼저 저장");
});
test("지원 종료 모델은 목록에 안내하고 실행은 거절", async () => {
  const store = database({ dcb_bots: [row(A, { model: "retired-model" })] });
  assert.equal((await listBots(store, A)).bots[0].available, false);
  await assert.rejects(resolveBot(store, A, BOT), { status: 400 });
});
test("삭제된 봇 참조를 다른 봇으로 자동 대체하지 않음", async () => {
  const store = database({ dcb_bots: [row()], dcb_rooms: [{ id: "room", user_id: A, bot_ref: BOT }] });
  await deleteBot(store, A, BOT, 1);
  assert.equal(store.tables.dcb_rooms[0].bot_ref, BOT);
  await assert.rejects(resolveBot(store, A, BOT), { status: 404 });
  assert.equal(await resolveBot(store, A, null), null);
});
test("과거 답변 설정은 원본 봇 수정·삭제와 독립적인 사본", () => {
  const bot = row();
  const saved = generationContext(bot, bot, "actual-model");
  bot.name = "수정"; bot.instructions = "다른 지침";
  assert.equal(saved.model, "actual-model");
  assert.equal(saved.bot.instructions, draft.instructions);
  assert.equal(saved.bot.name, draft.name);
  assert.equal(saved.bot.user_id, undefined);
  assert.equal(saved.user_id, undefined);
  assert.equal(generationContext({ ...bot, apiKey: "저장 금지" }, bot).apiKey, undefined);
  assert.equal(withBotInstructions("기존 플랫폼 지침", null), "기존 플랫폼 지침");
  assert.match(withBotInstructions("기존 플랫폼 지침", row()), /기존 플랫폼 지침[\s\S]*사용자 글의 핵심/);
});
test("DB 실패는 성공으로 처리하지 않고 세부 정보 숨김", async () => {
  const store = database({ dcb_bots: [row()] });
  store.fail = () => true;
  for (const call of [() => listBots(store, A), () => createBot(store, A, draft), () => resolveBot(store, A, BOT), () => updateBot(store, A, BOT, draft, 1), () => deleteBot(store, A, BOT, 1)]) await assert.rejects(call(), (e) => e.status === 500 && !e.message.includes("비공개 DB"));
});
