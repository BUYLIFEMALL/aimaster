import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ENGINE_URL, EngineError, IMAGE_SIZES, PROMPT_LIMIT, SEED_MAX, TITLE_LIMIT, checkArtInput, createEngineClient } from "../src/lib/engine.ts";
import { ENGINE, createMockEngine, memoryStorage } from "./mockEngine.mjs";

const A = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";
const B = "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb";
const ART = { title: "시험 그림", prompt: "a red apple on a wooden table", width: 1280, height: 720, seed: 3003 };
const client = (engine, storage, memberId = A, extra = {}) => createEngineClient({ memberId, storage, fetch: engine.fetch, ...extra });
const kind = (k) => (e) => e instanceof EngineError && e.kind === k;
const posts = (engine) => engine.st.calls.filter((c) => c.method === "POST" && c.path === "/queue");
async function paired(engine, storage = memoryStorage(), memberId = A) {
  const c = client(engine, storage, memberId);
  await c.pair(engine.st.codes[0]);
  return { c, storage };
}

test("엔진 주소는 루프백으로 고정 — 모든 요청이 그 주소로만 가고 쿠키·리다이렉트·캐시를 쓰지 않는다", async () => {
  assert.equal(ENGINE_URL, "http://127.0.0.1:47821");
  assert.equal(ENGINE_URL, ENGINE);
  const engine = createMockEngine();
  const { c } = await paired(engine);
  await c.getStatus();
  await c.listJobs();
  const r = await c.submit(ART);
  engine.finish(r.job.id);
  await c.fetchArt(r.job.id);
  await c.cancel(r.job.id);
  await c.dismiss(r.job.id);
  await c.getImageModels();
  assert.ok(engine.st.calls.length >= 8);
  for (const call of engine.st.calls) {
    assert.ok(call.url.startsWith(`${ENGINE_URL}/`), call.url);
    assert.equal(new URL(call.url).origin, ENGINE_URL);
    assert.equal(call.init.redirect, "error");
    assert.equal(call.init.credentials, "omit");
    assert.equal(call.init.cache, "no-store");
    assert.ok(call.init.signal instanceof AbortSignal, "시간 제한이 있다");
  }
  assert.equal(engine.st.calls.find((c2) => c2.path === "/status").auth, null, "상태 확인에는 토큰을 보내지 않는다");
  // 작업 번호 자리에 다른 주소를 끼워 넣을 수 없다(요청 자체가 나가지 않음)
  const before = engine.st.calls.length;
  for (const bad of ["../pair", "//evil.example/x", "http://evil.example", "", "x".repeat(36), `${r.job.id}/../../status`, null]) {
    await assert.rejects(c.cancel(bad), kind("invalid"));
    await assert.rejects(c.dismiss(bad), kind("invalid"));
    await assert.rejects(c.fetchArt(bad), kind("invalid"));
  }
  assert.equal(engine.st.calls.length, before);
  const src = await readFile(new URL("../src/lib/engine.ts", import.meta.url), "utf8");
  assert.ok(!/process\.env|NEXT_PUBLIC/.test(src), "엔진 주소를 환경변수로 바꾸지 않는다");
  assert.equal((src.match(/doFetch\(/g) ?? []).length, 1, "밖으로 나가는 호출은 한 곳");
  assert.match(src, /doFetch\(ENGINE_URL \+ path,/);
});

test("회원 번호가 없으면 연결 계층을 만들지 못한다", () => {
  for (const memberId of [undefined, null, "", "  ", "a", "../x", "a b c d e f g h"]) assert.throws(() => createEngineClient({ memberId, storage: memoryStorage(), fetch: async () => new Response() }), kind("invalid"));
});

test("연결: 코드 형식 검사 → 틀린 코드는 토큰을 건드리지 않음 → 성공하면 이 회원 칸에만 보관", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage();
  const c = client(engine, storage);
  assert.equal(c.isPaired(), false);
  for (const bad of ["", "12345", "1234567", "abcdef", null]) await assert.rejects(c.pair(bad), kind("invalid"));
  assert.equal(engine.st.calls.length, 0, "형식이 틀리면 엔진에 묻지 않는다");
  await assert.rejects(c.pair("000000"), kind("badCode"));
  assert.equal(c.isPaired(), false);
  assert.deepEqual(await c.pair(" 123456 "), { inherited: false });
  assert.equal(c.isPaired(), true);
  assert.deepEqual([...storage.map.keys()], [`fis.engineToken.v1:${A}`]);
  assert.equal(storage.map.get(`fis.engineToken.v1:${A}`), engine.st.tokens[0].token);
  assert.equal(engine.st.calls.at(-1).body.prevToken, undefined, "처음 연결에는 이전 토큰이 없다");
  assert.equal(engine.st.calls.at(-1).auth, null, "연결 요청에 토큰 머리글을 싣지 않는다");
  // 틀린 코드로 다시 연결을 시도해도 기존 연결은 그대로
  const token = storage.map.get(`fis.engineToken.v1:${A}`);
  await assert.rejects(c.pair("999999"), kind("badCode"));
  assert.equal(storage.map.get(`fis.engineToken.v1:${A}`), token);
  assert.equal((await c.listJobs()).length, 0);
});

test("다시 연결: 이전 토큰을 함께 보내 범위를 이어받고(목록 유지), 이전 토큰은 더 쓸 수 없다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const first = await c.submit(ART);
  const oldToken = storage.map.get(`fis.engineToken.v1:${A}`);
  assert.deepEqual(await c.pair(engine.st.codes[0]), { inherited: true });
  assert.equal(engine.st.calls.at(-1).body.prevToken, oldToken);
  assert.notEqual(storage.map.get(`fis.engineToken.v1:${A}`), oldToken);
  assert.deepEqual((await c.listJobs()).map((j) => j.id), [first.job.id], "같은 범위라 앞 작업이 그대로 보인다");
  assert.equal(engine.st.tokens.length, 1, "엔진에는 새 토큰만 남는다");
  // 연결을 끊은 뒤 새로 연결하면 이전 토큰이 없어 새 범위 — 앞 작업은 보이지 않는다
  c.disconnect();
  assert.equal(c.isPaired(), false);
  assert.deepEqual(await c.pair(engine.st.codes[0]), { inherited: false });
  assert.equal(engine.st.calls.at(-1).body.prevToken, undefined);
  assert.deepEqual(await c.listJobs(), []);
  await assert.rejects(c.cancel(first.job.id), kind("notFound"));
  assert.equal(c.submissions().length, 1, "접수 기록은 연결을 끊어도 남는다");
});

test("회원 분리: 토큰·접수 기록이 회원 번호별이고, 다른 회원은 앞 회원의 작업을 보지도 건드리지도 못한다", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage(); // 같은 브라우저(같은 저장소)
  const { c: a } = await paired(engine, storage, A);
  const mine = await a.submit(ART);
  engine.finish(mine.job.id);
  a.dispose();

  const b = client(engine, storage, B);
  assert.equal(b.isPaired(), false, "B에게는 A의 토큰이 보이지 않는다");
  assert.deepEqual(b.submissions(), [], "B에게는 A의 접수 기록이 보이지 않는다");
  await assert.rejects(b.listJobs(), kind("needPair"));
  assert.equal(engine.st.calls.at(-1).auth, null, "토큰 없이 물었다(A의 토큰을 쓰지 않음)");
  assert.deepEqual(await b.pair(engine.st.codes[0]), { inherited: false });
  assert.equal(engine.st.calls.at(-1).body.prevToken, undefined, "A의 토큰을 이전 토큰으로 보내지 않는다");
  assert.deepEqual(await b.listJobs(), []);
  for (const act of [() => b.cancel(mine.job.id), () => b.dismiss(mine.job.id), () => b.fetchArt(mine.job.id)]) await assert.rejects(act(), kind("notFound"));
  await assert.rejects(b.confirm(mine.requestId), kind("invalid"), "남의 접수 번호는 내 기록에 없다");
  await b.submit({ ...ART, seed: 4004 });
  assert.equal(engine.st.jobs.find((j) => j.id === mine.job.id).status, "done", "A의 작업은 그대로");

  // 같은 브라우저에서 A가 다시 들어오면 자기 토큰·기록·작업이 이어진다
  const a2 = client(engine, storage, A);
  assert.equal(a2.isPaired(), true);
  assert.deepEqual((await a2.listJobs()).map((j) => j.id), [mine.job.id]);
  assert.deepEqual(a2.submissions().map((s) => s.requestId), [mine.requestId]);
  assert.equal((await a2.fetchArt(mine.job.id)).type, "image/png");
  assert.deepEqual([...storage.map.keys()].sort(), [`fis.engineToken.v1:${A}`, `fis.engineToken.v1:${B}`, `fis.submissions.v1:${A}`, `fis.submissions.v1:${B}`].sort());
});

test("진행 중 응답 분리: 회원 전환·연결 해제·다시 연결 뒤에 도착한 응답은 버린다", async () => {
  const gateFor = (engine, match) => {
    let open;
    const gate = new Promise((r) => (open = r));
    engine.st.hold = (call) => (match(call) ? gate : null);
    return () => ((engine.st.hold = null), open());
  };
  // 1) 목록을 기다리는 중에 회원 전환(dispose)
  let engine = createMockEngine();
  let { c } = await paired(engine);
  await c.submit(ART);
  let release = gateFor(engine, (call) => call.method === "GET" && call.path === "/queue");
  let pending = c.listJobs();
  c.dispose();
  release();
  await assert.rejects(pending, kind("stale"));
  await assert.rejects(c.listJobs(), kind("stale"), "떠난 뒤에는 새 요청도 보내지 않는다");

  // 2) 연결(pair) 응답을 기다리는 중에 회원 전환 — 토큰을 저장하지 않는다
  engine = createMockEngine();
  const storage = memoryStorage();
  c = client(engine, storage);
  release = gateFor(engine, (call) => call.path === "/pair");
  pending = c.pair("123456");
  c.dispose();
  release();
  await assert.rejects(pending, kind("stale"));
  assert.equal(storage.map.size, 0, "늦게 온 토큰을 저장하지 않는다");

  // 3) 그림 받는 중에 연결 해제
  engine = createMockEngine();
  ({ c } = await paired(engine));
  const job = (await c.submit(ART)).job;
  engine.finish(job.id);
  release = gateFor(engine, (call) => call.path.startsWith("/image-art/"));
  pending = c.fetchArt(job.id);
  c.disconnect();
  release();
  await assert.rejects(pending, kind("stale"));

  // 4) 옛 토큰으로 보낸 요청이 401로 늦게 돌아와도, 그사이 새로 받은 토큰을 지우지 않는다
  engine = createMockEngine();
  const s4 = memoryStorage();
  ({ c } = await paired(engine, s4));
  release = gateFor(engine, (call) => call.method === "GET" && call.path === "/queue");
  engine.st.override = (call) => (call.method === "GET" && call.path === "/queue" ? new Response(JSON.stringify({ error: "PC 연결이 필요합니다.", needPair: true }), { status: 401 }) : null);
  pending = c.listJobs();
  engine.st.override = null;
  engine.st.hold = null;
  await c.pair(engine.st.codes[0]);
  const fresh = s4.map.get(`fis.engineToken.v1:${A}`);
  release();
  await assert.rejects(pending, kind("stale"));
  assert.equal(s4.map.get(`fis.engineToken.v1:${A}`), fresh);
  // 반대로 지금 토큰이 401이면 그 토큰만 지운다(연결 필요로 안내)
  engine.st.tokens = [];
  await assert.rejects(c.listJobs(), kind("needPair"));
  assert.equal(c.isPaired(), false);
});

test("접수: 접수 번호를 기록에 먼저 적고 보낸다. 받으면 accepted", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  let ledgerAtSend = null;
  const realFetch = engine.fetch;
  const c2 = createEngineClient({ memberId: A, storage, fetch: (url, init) => (init?.method === "POST" && String(url).endsWith("/queue") && (ledgerAtSend = JSON.parse(storage.map.get(`fis.submissions.v1:${A}`))), realFetch(url, init)) });
  const r = await c2.submit(ART);
  assert.equal(ledgerAtSend.length, 1, "보내는 순간 기록이 이미 있다");
  assert.equal(ledgerAtSend[0].state, "pending");
  assert.equal(ledgerAtSend[0].requestId, r.requestId);
  assert.equal(r.state, "accepted");
  const sent = posts(engine)[0].body;
  assert.equal(sent.clientRequestId, r.requestId);
  assert.match(sent.clientRequestId, /^[A-Za-z0-9-]{8,64}$/);
  assert.equal(sent.kind, "art");
  assert.match(sent.track.id, /^[0-9a-f-]{36}$/);
  assert.deepEqual(sent.task, { prompt: ART.prompt, width: 1280, height: 720, seed: 3003 });
  assert.deepEqual(c.submissions().map((s) => [s.state, s.jobId]), [["accepted", r.job.id]]);
  // 크기·시드·구성을 안 보내면 그 칸 자체를 싣지 않는다(엔진 기본값)
  await c.submit({ title: "기본", prompt: "a quiet mountain lake" });
  assert.deepEqual(posts(engine)[1].body.task, { prompt: "a quiet mountain lake" });
  assert.equal(engine.st.jobs.length, 2);
  assert.equal(new Set(engine.st.jobs.map((j) => j.clientRequestId)).size, 2);
});

test("기록을 적지 못하면 엔진에 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  storage.failSet = (k) => k.startsWith("fis.submissions");
  await assert.rejects(c.submit(ART), kind("storage"));
  assert.equal(posts(engine).length, 0);
  assert.equal(engine.st.jobs.length, 0);
});

test("응답 유실(엔진은 받음): unknown으로 남고 자동으로 다시 넣지 않는다 → 같은 번호로 확인하면 그 작업", async () => {
  const engine = createMockEngine();
  const { c } = await paired(engine);
  engine.st.loseResponse = (call) => call.method === "POST" && call.path === "/queue";
  const r = await c.submit(ART);
  engine.st.loseResponse = null;
  assert.equal(r.state, "unknown");
  assert.ok(kind("offline")(r.error));
  assert.equal(posts(engine).length, 1, "스스로 다시 보내지 않았다");
  assert.equal(engine.st.jobs.length, 1, "엔진은 이미 받았다");
  assert.equal(c.submissions()[0].state, "unknown");
  // 결과를 모르는 접수는 다시 보내기·지우기를 막는다(먼저 확인)
  await assert.rejects(c.resend(r.requestId), kind("invalid"));
  assert.equal(c.forget(r.requestId), false);
  assert.equal(posts(engine).length, 1);
  const confirmed = await c.confirm(r.requestId);
  assert.equal(confirmed.state, "accepted");
  assert.equal(confirmed.job.id, engine.st.jobs[0].id);
  assert.equal(confirmed.job.clientRequestId, r.requestId);
  assert.deepEqual(c.submissions().map((s) => [s.state, s.jobId]), [["accepted", engine.st.jobs[0].id]]);
  await assert.rejects(c.resend(r.requestId), kind("invalid"), "이미 접수된 것은 다시 보내지 않는다");
  assert.equal(posts(engine).length, 1);
  assert.equal(engine.st.jobs.length, 1, "중복 제출 0");
});

test("응답 유실(엔진은 못 받음): 확인하면 notReceived → 같은 번호·같은 내용으로 다시 보내 작업은 하나", async () => {
  const engine = createMockEngine();
  const { c } = await paired(engine);
  engine.st.unreachable = (call) => call.method === "POST" && call.path === "/queue";
  const r = await c.submit(ART);
  assert.equal(r.state, "unknown");
  assert.equal(engine.st.jobs.length, 0);
  // 확인 요청 자체가 실패하면 상태를 바꾸지 않는다
  engine.st.unreachable = () => true;
  await assert.rejects(c.confirm(r.requestId), kind("offline"));
  assert.equal(c.submissions()[0].state, "unknown");
  engine.st.unreachable = null;
  assert.deepEqual(await c.confirm(r.requestId), { state: "notReceived" });
  const again = await c.resend(r.requestId);
  assert.equal(again.state, "accepted");
  assert.equal(again.requestId, r.requestId);
  const [first, second] = posts(engine).map((p) => p.body);
  assert.deepEqual(second, first, "같은 번호·같은 내용(트랙 번호까지) 그대로");
  assert.equal(engine.st.jobs.length, 1);
  // 다시 보낸 응답도 잃어버린 경우: 확인 → 접수됨, 그래도 작업은 하나
  engine.st.jobs = [];
  engine.st.unreachable = (call) => call.method === "POST" && call.path === "/queue";
  const r2 = await c.submit({ ...ART, seed: 4004 });
  engine.st.unreachable = null;
  await c.confirm(r2.requestId);
  engine.st.loseResponse = (call) => call.method === "POST" && call.path === "/queue";
  assert.equal((await c.resend(r2.requestId)).state, "unknown");
  engine.st.loseResponse = null;
  assert.equal((await c.confirm(r2.requestId)).state, "accepted");
  assert.equal(engine.st.jobs.length, 1);
});

test("같은 접수를 동시에 두 번 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c } = await paired(engine);
  engine.st.unreachable = (call) => call.method === "POST" && call.path === "/queue";
  const r = await c.submit(ART);
  engine.st.unreachable = null;
  await c.confirm(r.requestId);
  let open;
  const gate = new Promise((res) => (open = res));
  engine.st.hold = (call) => (call.method === "POST" && call.path === "/queue" ? gate : null);
  const first = c.resend(r.requestId);
  await assert.rejects(c.resend(r.requestId), kind("invalid"));
  open();
  assert.equal((await first).state, "accepted");
  assert.equal(posts(engine).filter((p) => p.body.clientRequestId === r.requestId).length, 2, "처음 1번 + 다시 보내기 1번뿐");
  assert.equal(engine.st.jobs.length, 1);
});

test("거절 응답: 409·503·400·429·401·403은 rejected(엔진에 작업 없음), 500은 unknown", async () => {
  const reply = (status, body) => () => new Response(body === undefined ? "<html>oops</html>" : JSON.stringify(body), { status });
  const cases = [
    [409, { error: "같은 접수 번호로 다른 내용이 이미 접수돼 있습니다." }, "conflict", "rejected"],
    [503, { error: "작업 기록 파일을 읽지 못해 이 사이트의 작업을 멈췄습니다(읽기 실패). 엔진 창을 확인해 주세요." }, "closed", "rejected"],
    [400, { error: "그릴 수 없는 크기입니다(1024×1024 · 1280×720 · 720×1280)." }, "invalid", "rejected"],
    [429, { error: "잠시 뒤 다시 시도해 주세요." }, "busy", "rejected"],
    [403, { error: "허용되지 않은 사이트입니다." }, "forbidden", "rejected"],
    [401, { error: "PC 연결이 필요합니다.", needPair: true }, "needPair", "rejected"],
    [500, undefined, "error", "unknown"],
    [502, { error: 42 }, "error", "unknown"],
  ];
  for (const [status, body, k, state] of cases) {
    const engine = createMockEngine();
    const { c } = await paired(engine);
    engine.st.override = (call) => (call.method === "POST" && call.path === "/queue" ? reply(status, body)() : null);
    const r = await c.submit(ART);
    assert.equal(r.state, state, String(status));
    assert.equal(r.error.kind, k, String(status));
    assert.equal(r.error.status, status);
    assert.ok(r.error.message.length > 0 && !/<html>/.test(r.error.message), "본문이 JSON이 아니어도 한국어 기본 문구");
    if (body && typeof body.error === "string") assert.equal(r.error.message, body.error, "엔진이 준 문구를 그대로 보여 준다");
    assert.equal(engine.st.jobs.length, 0);
    assert.deepEqual(c.submissions().map((s) => [s.state, s.errorKind]), [[state, k]]);
    assert.equal(posts(engine).length, 1, "자동 재시도 없음");
    engine.st.override = null;
    if (k === "conflict" || k === "invalid") {
      await assert.rejects(c.resend(r.requestId), kind("invalid"), "내용 문제로 거절된 접수는 같은 번호로 다시 보내지 않는다");
      assert.equal(posts(engine).length, 1);
    }
    if (k === "closed" || k === "busy") {
      const again = await c.resend(r.requestId); // 엔진이 풀린 뒤 같은 번호로
      assert.equal(again.state, "accepted");
      assert.equal(again.requestId, r.requestId);
      assert.equal(engine.st.jobs.length, 1);
    }
    if (k === "needPair") assert.equal(c.isPaired(), false, "401이면 이 토큰을 지운다");
  }
});

test("실제 계약 흐름의 오류: 엔진이 닫힘(503)·남의 작업(404)·같은 번호 다른 내용(409)·끝나지 않은 작업 지우기(400)", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const r = await c.submit(ART);
  // 503: 목록·접수·취소 모두 닫힘으로, 자동 재시도 없음
  engine.st.queueBroken = "내용이 올바르지 않음";
  const n = engine.st.calls.length;
  await assert.rejects(c.listJobs(), kind("closed"));
  await assert.rejects(c.cancel(r.job.id), kind("closed"));
  await assert.rejects(c.confirm(r.requestId), kind("closed"));
  assert.equal((await c.submit({ ...ART, seed: 1 })).state, "rejected");
  assert.equal(engine.st.calls.length, n + 4);
  assert.equal(c.submissions()[0].state, "accepted", "확인이 실패해도 앞 기록은 그대로");
  engine.st.queueBroken = "";
  // 404: 없는 번호·남의 범위
  await assert.rejects(c.cancel("00000000-0000-4000-8000-000000000000"), kind("notFound"));
  await assert.rejects(c.fetchArt(r.job.id), kind("notFound"), "아직 그리지 않은 작업의 그림은 없다");
  // 400: 끝나지 않은 작업은 지울 수 없다
  await assert.rejects(c.dismiss(r.job.id), (e) => kind("invalid")(e) && e.message === "끝난 작업만 지울 수 있습니다.");
  // 409: 기록의 내용이 바뀐 채 같은 번호가 가면 엔진이 막는다(연결 계층은 내용을 바꿔 보내지 않지만, 저장소가 손상된 경우)
  await c.cancel(r.job.id);
  const key = `fis.submissions.v1:${A}`;
  const ledger = JSON.parse(storage.map.get(key));
  ledger[0] = { ...ledger[0], state: "notReceived", task: { ...ledger[0].task, seed: 9 } };
  storage.map.set(key, JSON.stringify(ledger));
  const conflict = await c.resend(r.requestId);
  assert.equal(conflict.state, "rejected");
  assert.equal(conflict.error.kind, "conflict");
  assert.equal(engine.st.jobs.filter((j) => j.clientRequestId === r.requestId).length, 1);
  // 연결 기록이 깨진 엔진: 모든 요청이 연결 필요, 새 연결은 503
  engine.st.tokensBroken = "읽기 실패";
  await assert.rejects(c.listJobs(), kind("needPair"));
  await assert.rejects(c.pair(engine.st.codes[0]), kind("closed"));
  assert.equal(c.isPaired(), false);
});

test("보내기 전 검사: 엔진이 받지 않을 입력은 요청도 기록도 만들지 않는다", async () => {
  const engine = createMockEngine();
  const { c } = await paired(engine);
  const bad = [
    { ...ART, prompt: "빨간 사과 한 개" },
    { ...ART, prompt: "a red 사과 on table" },
    { ...ART, prompt: "red apple" },
    { ...ART, prompt: "" },
    { ...ART, prompt: `${"word ".repeat(200)}` },
    { ...ART, title: "" },
    { ...ART, title: "가".repeat(TITLE_LIMIT + 1) },
    { ...ART, width: 1344, height: 768 },
    { ...ART, width: 1280, height: undefined },
    { ...ART, width: 720, height: 720 },
    { ...ART, seed: -1 },
    { ...ART, seed: 1.5 },
    { ...ART, seed: SEED_MAX + 1 },
    { ...ART, variantId: "../x y" },
  ];
  for (const input of bad) await assert.rejects(c.submit(input), kind("invalid"), JSON.stringify(input).slice(0, 80));
  assert.equal(posts(engine).length, 0);
  assert.deepEqual(c.submissions(), []);
  assert.equal(checkArtInput(ART), null);
  for (const [w, h] of IMAGE_SIZES) assert.equal(checkArtInput({ ...ART, width: w, height: h }), null);
  assert.equal(checkArtInput({ ...ART, seed: 0 }), null);
  assert.equal(checkArtInput({ ...ART, seed: SEED_MAX }), null);
  assert.equal(checkArtInput({ ...ART, prompt: "a ".repeat(PROMPT_LIMIT / 2 - 1) + "ab" }), null);
});

test("그림 받기: PNG만 받는다. 엔진이 꺼져 있으면 상태는 null, 다른 호출은 offline", async () => {
  const engine = createMockEngine();
  const { c } = await paired(engine);
  const job = (await c.submit(ART)).job;
  engine.finish(job.id);
  const blob = await c.fetchArt(job.id);
  assert.equal(blob.type, "image/png");
  assert.deepEqual([...new Uint8Array(await blob.arrayBuffer()).slice(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  engine.st.override = (call) => (call.path.startsWith("/image-art/") ? new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }) : null);
  await assert.rejects(c.fetchArt(job.id), kind("error"));
  engine.st.override = null;
  engine.st.unreachable = () => true;
  assert.equal(await c.getStatus(), null);
  await assert.rejects(c.listJobs(), kind("offline"));
  await assert.rejects(c.getImageModels(), kind("offline"));
  assert.equal(c.isPaired(), true, "꺼져 있다고 연결을 지우지 않는다");
});

test("접수 기록이 많아져도 결과를 모르는 접수는 지우지 않는다", async () => {
  const engine = createMockEngine();
  const storage = memoryStorage();
  const { c } = await paired(engine, storage);
  const key = `fis.submissions.v1:${A}`;
  const old = Array.from({ length: 320 }, (_, i) => ({ requestId: `old-${String(i).padStart(8, "0")}`, trackId: "t", title: "t", task: { prompt: "a b c" }, state: i % 40 === 0 ? "unknown" : "accepted", jobId: "j", at: i }));
  storage.map.set(key, JSON.stringify(old));
  await c.submit(ART);
  const after = c.submissions();
  assert.equal(after.length, 300);
  assert.equal(after.filter((s) => s.state === "unknown").length, 8, "unknown 8건은 모두 남는다");
  assert.ok(after.some((s) => s.state === "accepted" && s.title === ART.title), "방금 접수한 것도 남는다");
  // 깨진 기록은 빈 목록으로 읽는다(예외 없음)
  storage.map.set(key, "{not json");
  assert.deepEqual(c.submissions(), []);
});

test("계약 대조: 모의 엔진이 흉내 낸 규칙이 엔진 소스(e8e52b505 기준)에 그대로 있다", async (t) => {
  const dir = fileURLToPath(new URL("../../free-music-studio/engine/src/", import.meta.url));
  if (!existsSync(`${dir}gateway.mjs`)) return t.skip("엔진 소스가 이 장비에 없음");
  const [gateway, security, queue, imageArt] = await Promise.all(["gateway.mjs", "security.mjs", "queue.mjs", "imageArt.mjs"].map((f) => readFile(dir + f, "utf8")));
  const has = (src, text, what) => assert.ok(src.includes(text), `엔진 계약이 바뀌었을 수 있다 — ${what}: ${text}`);
  // 접수 번호 형식·필수, 접수 본문
  has(gateway, "const CLIENT_REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;", "접수 번호 형식");
  has(gateway, '{ error: "접수 번호가 올바르지 않습니다." }', "접수 번호 거절");
  has(gateway, 'meta.kind !== "art"', "그림 작업만");
  has(gateway, "site: origin, scope, clientRequestId, digest", "작업에 범위·접수 번호 기록");
  has(gateway, "JSON.stringify([variantId ?? null, prompt, width ?? null, height ?? null, seed ?? null])", "내용 요약 항목");
  has(gateway, "seed >= 0 && seed <= 2147483647", "시드 범위");
  has(gateway, '{ error: "그릴 수 없는 크기입니다(1024×1024 · 1280×720 · 720×1280)." }', "크기 거절");
  // 범위 격리·오류 상태
  has(gateway, "const ownedBy = (origin, scope) => (j) => !!j && j.site === origin && j.scope === scope;", "자기 범위만");
  has(gateway, 'if (!own(job)) return json(res, 404, { error: "그 작업을 찾지 못했습니다." }, origin);', "남의 작업 404");
  has(gateway, "if (q.broken) return json(res, 503,", "닫힌 대기열 503");
  has(gateway, '{ error: "끝난 작업만 지울 수 있습니다." }', "끝난 작업만 지움");
  has(gateway, '{ error: "PC 연결이 필요합니다.", needPair: true }', "연결 필요 401");
  // 연결·이전 토큰
  has(gateway, 'prevToken: typeof body?.prevToken === "string" ? body.prevToken : undefined', "이전 토큰 전달");
  has(gateway, "{ token: issued.token, inherited: issued.inherited }", "연결 응답");
  has(gateway, "bearer(req.headers.authorization)", "토큰은 Authorization 머리글");
  has(security, "typeof t.scope === \"string\"", "토큰에 범위 기록");
  // 대기열: 같은 번호 처리와 목록에 접수 번호가 실림
  has(queue, "j.clientRequestId === request.clientRequestId && j.site === request.site && j.scope === request.scope", "같은 범위·같은 번호");
  has(queue, "if (same.digest !== request.digest) throw new QueueConflictError();", "내용이 다르면 409");
  has(queue, "this.status = 409;", "409");
  has(queue, "this.status = 503;", "503");
  has(queue, "export const MAX_QUEUED = 50;", "대기 상한");
  has(queue, "const { task: _task, fields: _fields, source: _source, ...rest } = j;", "목록에는 접수 번호가 남고 요청 원문은 빠짐");
  has(imageArt, "export const ART_PROMPT_LIMIT = 900;", "설명 길이");
  assert.equal(PROMPT_LIMIT, 900);
  assert.equal(SEED_MAX, 2147483647);
  // 허용 크기 목록이 엔진과 정확히 같은 세 개(순서 포함)
  const sizes = [...imageArt.slice(imageArt.indexOf("export const IMAGE_SIZES"), imageArt.indexOf("export const isImageSize")).matchAll(/\{ width: (\d+), height: (\d+) \}/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.deepEqual(sizes, IMAGE_SIZES.map(([w, h]) => [w, h]));
});
