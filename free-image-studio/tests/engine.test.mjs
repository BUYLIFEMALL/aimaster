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
const lostPost = (call) => call.method === "POST" && call.path === "/queue";
const keys = (m) => [`fis.engineLink.v1:${m}`, `fis.engineToken.v1:${m}`];
const busy429 = (call) => (lostPost(call) ? new Response(JSON.stringify({ error: "잠시 뒤 다시 시도해 주세요." }), { status: 429 }) : null);
const idJobs = (engine, id) => engine.st.jobs.filter((j) => j.clientRequestId === id);
const stateOf = (c, id) => c.submissions().find((x) => x.requestId === id)?.state;
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
  assert.deepEqual([...storage.map.keys()].sort(), keys(A), "토큰과 연결 범위 표시만, 이 회원 칸에");
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
  assert.deepEqual([...storage.map.keys()].sort(), [...keys(A), ...keys(B), `fis.submissions.v1:${A}`, `fis.submissions.v1:${B}`].sort());
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
  assert.equal(c.canResend(r.requestId), false);
  assert.equal(c.forget(r.requestId), false, "결과를 모르는 접수는 그냥 지우지 못한다");
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

test("응답 유실(엔진은 못 받음): 목록에 없어도 미접수로 확정하지 않는다 — unknown 유지, 같은 번호 재전송 없음", async () => {
  // 앞선 작업이 남아 있는 같은 범위 / 빈 목록(범위의 첫 접수) 둘 다
  for (const withEarlier of [true, false]) {
    const engine = createMockEngine();
    const { c } = await paired(engine);
    if (withEarlier) await c.submit({ ...ART, seed: 1 });
    engine.st.unreachable = lostPost;
    const r = await c.submit(ART);
    assert.equal(r.state, "unknown");
    // 확인 요청 자체가 실패하면 상태를 바꾸지 않는다
    engine.st.unreachable = () => true;
    await assert.rejects(c.confirm(r.requestId), kind("offline"));
    assert.equal(stateOf(c, r.requestId), "unknown");
    engine.st.unreachable = null;
    assert.deepEqual(await c.confirm(r.requestId), { state: "unknown", reason: "notListed" });
    assert.deepEqual(await c.confirm(r.requestId), { state: "unknown", reason: "notListed" }, "여러 번 물어도 같다");
    assert.equal(stateOf(c, r.requestId), "unknown");
    assert.equal(c.canResend(r.requestId), false);
    await assert.rejects(c.resend(r.requestId), kind("invalid"));
    assert.equal(posts(engine).filter((p) => p.body.clientRequestId === r.requestId).length, 1, "같은 번호를 다시 보내지 않았다");
    assert.equal(idJobs(engine, r.requestId).length, 0);
    // 사용자가 알고 고른 경우에만 기록을 지운다(그 뒤 새로 접수하는 것은 화면·사용자의 선택)
    assert.equal(c.forget(r.requestId), false);
    assert.equal(c.forget(r.requestId, { force: true }), true);
    assert.equal(stateOf(c, r.requestId), undefined);
  }
});

test("반례(Master) — 앞선 작업은 남아 있고 대상 작업만 지워진 목록: 미접수가 아니라 unknown, 다시 그리지 않는다", async () => {
  const engine = createMockEngine();
  const { c } = await paired(engine);
  const earlier = await c.submit({ ...ART, seed: 1 });
  engine.st.loseResponse = lostPost;
  const r = await c.submit(ART); // 엔진은 받았고 응답만 잃음
  engine.st.loseResponse = null;
  const later = await c.submit({ ...ART, seed: 2 });
  assert.equal(r.state, "unknown");
  const target = idJobs(engine, r.requestId)[0];
  // 엔진이 그 그림을 다 그렸고, 그 작업 하나만 목록에서 사라졌다(엔진 창에서 지움·끝난 작업 정리)
  engine.finish(target.id);
  engine.st.jobs = engine.st.jobs.filter((j) => j !== target);
  assert.deepEqual((await c.listJobs()).map((j) => j.clientRequestId), [earlier.requestId, later.requestId], "앞뒤 작업은 그대로 보인다");
  assert.deepEqual(await c.confirm(r.requestId), { state: "unknown", reason: "notListed" });
  assert.equal(stateOf(c, r.requestId), "unknown");
  assert.equal(c.canResend(r.requestId), false);
  await assert.rejects(c.resend(r.requestId), kind("invalid"));
  assert.equal(posts(engine).filter((p) => p.body.clientRequestId === r.requestId).length, 1);
  assert.equal(idJobs(engine, r.requestId).length, 0, "이미 그린 그림을 같은 번호로 다시 그리게 하지 않았다");
  assert.equal(engine.st.jobs.length, 2);
});

test("다시 보내기는 넣기 전 거절이 확실하고 다시 해 볼 만한 접수만 — 같은 번호·같은 내용, 동시에 두 번 보내지 않는다", async () => {
  const engine = createMockEngine();
  const { c } = await paired(engine);
  engine.st.override = busy429;
  const r = await c.submit(ART);
  engine.st.override = null;
  assert.equal(r.state, "rejected");
  assert.equal(c.canResend(r.requestId), true);
  assert.equal(engine.st.jobs.length, 0);
  let open;
  const gate = new Promise((res) => (open = res));
  engine.st.hold = (call) => (lostPost(call) ? gate : null);
  const first = c.resend(r.requestId);
  assert.equal(c.canResend(r.requestId), false);
  await assert.rejects(c.resend(r.requestId), kind("invalid"));
  await assert.rejects(c.confirm(r.requestId), kind("invalid"));
  open();
  engine.st.hold = null;
  const again = await first;
  assert.equal(again.state, "accepted");
  assert.equal(again.requestId, r.requestId);
  const sent = posts(engine).filter((p) => p.body.clientRequestId === r.requestId).map((p) => p.body);
  assert.equal(sent.length, 2, "처음 1번 + 다시 보내기 1번뿐");
  assert.deepEqual(sent[1], sent[0], "같은 번호·같은 내용(트랙 번호까지) 그대로");
  assert.equal(idJobs(engine, r.requestId).length, 1);
  await assert.rejects(c.resend(r.requestId), kind("invalid"), "접수된 뒤에는 다시 보내지 않는다");
  // 다시 보낸 응답을 잃으면 unknown이 되고 더는 보내지 않는다. 목록에서 찾으면 접수됨
  engine.st.override = busy429;
  const r2 = await c.submit({ ...ART, seed: 4004 });
  engine.st.override = null;
  engine.st.loseResponse = lostPost;
  assert.equal((await c.resend(r2.requestId)).state, "unknown");
  engine.st.loseResponse = null;
  await assert.rejects(c.resend(r2.requestId), kind("invalid"));
  assert.equal((await c.confirm(r2.requestId)).state, "accepted");
  assert.equal(idJobs(engine, r2.requestId).length, 1);
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
  ledger[0] = { ...ledger[0], state: "rejected", errorKind: "busy", task: { ...ledger[0].task, seed: 9 } };
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

test("반례 1 — 범위가 끊긴 과거 접수는 확인도 다시 보내기도 하지 않는다(같은 그림 두 번 방지)", async () => {
  const idCount = (engine, id) => engine.st.jobs.filter((j) => j.clientRequestId === id).length;
  const lostAccepted = async (engine, c) => {
    await c.submit({ ...ART, seed: 1 });
    engine.st.loseResponse = lostPost;
    const r = await c.submit(ART); // 엔진은 받았고 응답만 잃음
    engine.st.loseResponse = null;
    assert.equal(r.state, "unknown");
    assert.equal(idCount(engine, r.requestId), 1);
    return r;
  };
  const mustStayUnknown = async (engine, c, r) => {
    assert.equal(c.inCurrentScope(r.requestId), false);
    const n = engine.st.calls.length;
    assert.deepEqual(await c.confirm(r.requestId), { state: "unknown", reason: "otherScope" });
    assert.equal(engine.st.calls.length, n, "새 범위의 목록으로 과거 접수를 판단하지 않는다(묻지도 않음)");
    await assert.rejects(c.resend(r.requestId), kind("invalid"));
    assert.equal(c.submissions().find((x) => x.requestId === r.requestId).state, "unknown");
    assert.equal(posts(engine).filter((p) => p.body.clientRequestId === r.requestId).length, 1);
    assert.equal(idCount(engine, r.requestId), 1, "같은 접수 번호의 작업은 여전히 하나");
  };

  // 가) 연결 끊기 → 같은 회원이 새로 연결(이전 토큰 없음 → 새 범위)
  let engine = createMockEngine();
  let { c, storage } = await paired(engine);
  let r = await lostAccepted(engine, c);
  c.disconnect();
  assert.deepEqual(await c.pair(engine.st.codes[0]), { inherited: false });
  await mustStayUnknown(engine, c, r);
  // 새 범위에 작업이 생겨도 과거 접수는 그대로
  await c.submit({ ...ART, seed: 7 });
  await mustStayUnknown(engine, c, r);
  assert.equal(c.forget(r.requestId), true, "확인할 길이 없는 과거 접수는 기록에서 지울 수 있다");

  // 나) 엔진에서 토큰이 무효가 됨 → 401 → 새 연결
  engine = createMockEngine();
  ({ c, storage } = await paired(engine));
  r = await lostAccepted(engine, c);
  engine.st.tokens = [];
  await assert.rejects(c.confirm(r.requestId), kind("needPair"));
  assert.equal(c.submissions().find((x) => x.requestId === r.requestId).state, "unknown", "401은 미접수 근거가 아니다");
  assert.deepEqual(await c.pair(engine.st.codes[0]), { inherited: false });
  await mustStayUnknown(engine, c, r);

  // 다) 다시 연결의 응답을 잃음: 엔진은 범위를 이어 새 토큰을 냈지만 브라우저는 못 받았다 → 옛 토큰 401 → 새 범위
  engine = createMockEngine();
  ({ c, storage } = await paired(engine));
  r = await lostAccepted(engine, c);
  engine.st.loseResponse = (call) => call.path === "/pair";
  await assert.rejects(c.pair(engine.st.codes[0]), kind("offline"));
  engine.st.loseResponse = null;
  await assert.rejects(c.listJobs(), kind("needPair"));
  assert.deepEqual(await c.pair(engine.st.codes[0]), { inherited: false });
  await mustStayUnknown(engine, c, r);

  // 라) 토큰은 있는데 범위 표시가 지워진 저장소 → 이전 접수와 잇지 않는다
  engine = createMockEngine();
  ({ c, storage } = await paired(engine));
  r = await lostAccepted(engine, c);
  storage.map.delete(`fis.engineLink.v1:${A}`);
  assert.deepEqual(await c.confirm(r.requestId), { state: "unknown", reason: "otherScope" });
  await c.submit({ ...ART, seed: 8 });
  await mustStayUnknown(engine, c, r);
});

test("정상 — 같은 범위를 이어받은 다시 연결 뒤: 엔진이 받은 유실 접수는 찾아서 접수됨, 거절됐던 접수는 같은 번호로 다시 보냄", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  const link = storage.map.get(`fis.engineLink.v1:${A}`);
  await c.submit({ ...ART, seed: 1 });
  engine.st.loseResponse = lostPost;
  const got = await c.submit(ART); // 엔진은 받음
  engine.st.loseResponse = null;
  engine.st.unreachable = lostPost;
  const missed = await c.submit({ ...ART, seed: 5 }); // 엔진은 못 받음
  engine.st.unreachable = null;
  engine.st.override = busy429;
  const refused = await c.submit({ ...ART, seed: 6 }); // 넣기 전 거절
  engine.st.override = null;
  assert.deepEqual(await c.pair(engine.st.codes[0]), { inherited: true });
  assert.equal(storage.map.get(`fis.engineLink.v1:${A}`), link, "이어받은 연결은 범위 표시가 그대로");
  assert.equal(c.inCurrentScope(got.requestId), true);
  const a = await c.confirm(got.requestId);
  assert.equal(a.state, "accepted");
  assert.equal(a.job.clientRequestId, got.requestId);
  assert.deepEqual(await c.confirm(missed.requestId), { state: "unknown", reason: "notListed" });
  await assert.rejects(c.resend(missed.requestId), kind("invalid"));
  assert.equal((await c.resend(refused.requestId)).state, "accepted");
  assert.equal(engine.st.jobs.length, 3);
  assert.equal(idJobs(engine, got.requestId).length, 1);
  assert.equal(idJobs(engine, missed.requestId).length, 0);
  assert.equal(idJobs(engine, refused.requestId).length, 1);
});

test("반례 2 — 온전하지 않은 목록은 예외(상태 유지), 온전한 목록의 부재는 어떤 모양이든 unknown", async () => {
  const setup = async () => {
    const engine = createMockEngine();
    const { c } = await paired(engine);
    return { engine, c };
  };
  // 가) 엔진에 작업이 있는데 목록 응답 모양이 이상함 → 예외, 상태 그대로
  for (const body of [{ jobs: null }, { jobs: {} }, { jobs: "none" }, {}, { jobs: [null] }, { jobs: [{ id: 1 }] }, { jobs: [{ id: "x" }] }, []]) {
    const { engine, c } = await setup();
    await c.submit({ ...ART, seed: 1 });
    engine.st.loseResponse = lostPost;
    const r = await c.submit(ART);
    engine.st.loseResponse = null;
    engine.st.override = (call) => (call.method === "GET" && call.path === "/queue" ? new Response(JSON.stringify(body), { status: 200 }) : null);
    await assert.rejects(c.confirm(r.requestId), kind("error"), JSON.stringify(body));
    assert.equal(stateOf(c, r.requestId), "unknown", JSON.stringify(body));
    await assert.rejects(c.resend(r.requestId), kind("invalid"));
    engine.st.override = null;
    assert.equal((await c.confirm(r.requestId)).state, "accepted", "온전한 목록이 오면 그때 확인된다");
    assert.equal(idJobs(engine, r.requestId).length, 1);
  }
  // 나) 엔진 기록이 통째로 사라짐(빈 목록) / 나중 작업만 남음 / 앞선 작업만 남음 — 모두 unknown
  const { engine, c } = await setup();
  await c.submit({ ...ART, seed: 1 });
  engine.st.loseResponse = lostPost;
  const r = await c.submit(ART); // 엔진은 받음
  engine.st.loseResponse = null;
  await c.submit({ ...ART, seed: 2 });
  const all = engine.st.jobs;
  const i = all.findIndex((j) => j.clientRequestId === r.requestId);
  for (const [name, jobs] of [["빈 목록", []], ["나중 작업만", all.slice(i + 1)], ["앞선 작업만", all.slice(0, i)], ["앞뒤만", all.filter((_, k) => k !== i)]]) {
    engine.st.jobs = jobs;
    assert.deepEqual(await c.confirm(r.requestId), { state: "unknown", reason: "notListed" }, name);
    assert.equal(stateOf(c, r.requestId), "unknown", name);
    await assert.rejects(c.resend(r.requestId), kind("invalid"), name);
  }
  assert.equal(posts(engine).filter((p) => p.body.clientRequestId === r.requestId).length, 1);
  engine.st.jobs = all;
  assert.equal((await c.confirm(r.requestId)).state, "accepted");
  // 다) 거절이 확실한 접수를 확인해도(목록에 없음) 거절 상태를 지우지 않는다
  engine.st.override = busy429;
  const refused = await c.submit({ ...ART, seed: 3 });
  engine.st.override = null;
  assert.deepEqual(await c.confirm(refused.requestId), { state: "unknown", reason: "notListed" });
  assert.equal(stateOf(c, refused.requestId), "rejected");
  assert.equal(c.canResend(refused.requestId), true);
});

test("반례 3 — 넣은 뒤 실패일 수 있는 400은 받았는지 모름(unknown), 사전 거절이 확실한 400만 rejected", async () => {
  // 가) 엔진이 목록에 넣은 뒤 파일 저장에 실패해 400으로 답함
  const engine = createMockEngine();
  const { c } = await paired(engine);
  await c.submit({ ...ART, seed: 1 });
  engine.st.after = (call) => (lostPost(call) ? new Response(JSON.stringify({ error: "EPERM: operation not permitted, rename 'queue-scoped.json.tmp' -> 'queue-scoped.json'" }), { status: 400 }) : null);
  const r = await c.submit(ART);
  engine.st.after = null;
  assert.equal(r.state, "unknown");
  assert.equal(r.error.status, 400);
  assert.equal(engine.st.jobs.filter((j) => j.clientRequestId === r.requestId).length, 1, "엔진에는 작업이 있다");
  await assert.rejects(c.resend(r.requestId), kind("invalid"));
  const confirmed = await c.confirm(r.requestId);
  assert.equal(confirmed.state, "accepted");
  assert.equal(engine.st.jobs.filter((j) => j.clientRequestId === r.requestId).length, 1);
  // 나) 문구가 없거나 모르는 400
  for (const body of [{}, { error: "" }, { error: "작업 요청을 처리하지 못했습니다." }, { error: "그릴 수 없는 크기입니다" }]) {
    const e2 = createMockEngine();
    const { c: c2 } = await paired(e2);
    e2.st.override = (call) => (lostPost(call) ? new Response(JSON.stringify(body), { status: 400 }) : null);
    assert.equal((await c2.submit(ART)).state, "unknown", JSON.stringify(body));
  }
  // 다) 엔진이 넣기 전에 돌려주는 문구는 rejected(내용 문제 → 같은 번호로 다시 보내지 않음)
  for (const error of ["그림 작업 내용이 올바르지 않습니다.", "접수 번호가 올바르지 않습니다.", "그릴 수 없는 크기입니다(1024×1024 · 1280×720 · 720×1280).", "시드 값이 올바르지 않습니다.", "그림 설명을 영어로 3단어 이상 적어 주세요(내 PC 그림 모델은 영어만 읽습니다)."]) {
    const e3 = createMockEngine();
    const { c: c3 } = await paired(e3);
    e3.st.override = (call) => (lostPost(call) ? new Response(JSON.stringify({ error }), { status: 400 }) : null);
    const r3 = await c3.submit(ART);
    assert.equal(r3.state, "rejected", error);
    e3.st.override = null;
    await assert.rejects(c3.resend(r3.requestId), kind("invalid"));
  }
  // 라) 대기열이 가득 참(실제 모의 엔진 규칙): rejected지만 잠시 뒤 같은 번호로 다시 보낼 수 있다
  const e4 = createMockEngine();
  const { c: c4 } = await paired(e4);
  for (let i = 0; i < 50; i++) e4.st.jobs.push({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, kind: "art", status: "queued", scope: "다른 범위", clientRequestId: `other-${i}-xxxx`, digest: "d" });
  const full = await c4.submit(ART);
  assert.equal(full.state, "rejected");
  assert.equal(c4.submissions()[0].errorKind, "busy");
  assert.match(full.error.message, /^대기열에는 50개까지 넣을 수 있습니다\./);
  e4.st.jobs = [];
  assert.equal((await c4.resend(full.requestId)).state, "accepted");
  assert.equal(e4.st.jobs.length, 1);
});

test("반례 4 — 늦게 온 확인 결과가 접수됨을 되돌리지 않는다", async () => {
  const engine = createMockEngine();
  const { c, storage } = await paired(engine);
  await c.submit({ ...ART, seed: 1 });
  engine.st.loseResponse = lostPost;
  const r = await c.submit(ART); // 엔진은 받음
  engine.st.loseResponse = null;
  const real = idJobs(engine, r.requestId)[0];
  // 처음 확인은 그 작업이 빠진 옛 목록을 받아 둔 채 응답이 늦어진다
  let open;
  let seen = 0;
  const gate = new Promise((res) => (open = res));
  const isList = (call) => call.method === "GET" && call.path === "/queue";
  engine.st.override = (call) => (isList(call) && seen === 0 ? new Response(JSON.stringify({ jobs: engine.st.jobs.filter((j) => j !== real).map(({ task: _t, ...rest }) => rest) }), { status: 200 }) : null);
  engine.st.hold = (call) => (isList(call) && seen++ === 0 ? gate : null);
  const first = c.confirm(r.requestId);
  // 같은 화면: 확인 중에는 그 접수의 다른 확인·다시 보내기·지우기를 받지 않는다
  await assert.rejects(c.confirm(r.requestId), kind("invalid"));
  await assert.rejects(c.resend(r.requestId), kind("invalid"));
  assert.equal(c.forget(r.requestId, { force: true }), false);
  // 다른 탭(같은 저장소, 다른 화면)이 그사이 온전한 목록으로 접수됨을 확인한다
  const tab2 = client(engine, storage);
  const fresh = await tab2.confirm(r.requestId);
  assert.equal(fresh.state, "accepted");
  assert.equal(fresh.job.id, real.id);
  open(); // 처음 확인의 옛 목록이 이제 도착
  assert.deepEqual(await first, { state: "accepted", job: null });
  const after = c.submissions().find((x) => x.requestId === r.requestId);
  assert.equal(after.state, "accepted", "옛 응답이 접수됨을 덮지 않았다");
  assert.equal(after.jobId, real.id);
  await assert.rejects(c.resend(r.requestId), kind("invalid"));
  assert.equal(posts(engine).filter((p) => p.body.clientRequestId === r.requestId).length, 1, "추가 전송 없음");
  assert.equal(idJobs(engine, r.requestId).length, 1);
  // 접수됨으로 적힌 작업이 목록에서 사라져도(끝난 작업 지움·정리) 되돌리지 않는다
  engine.st.override = null;
  engine.st.jobs = engine.st.jobs.filter((j) => j !== real);
  assert.deepEqual(await c.confirm(r.requestId), { state: "accepted", job: null });
  assert.equal(stateOf(c, r.requestId), "accepted");
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
  // 넣은 뒤 저장: 저장이 실패하면 작업은 목록에 남고 연결 문은 기본 400으로 답한다 → 400은 문구로 가려야 한다
  has(queue, "jobs.push(job);\n      await save();", "목록에 넣은 뒤 저장을 기다림");
  has(gateway, 'return json(res, e?.status ?? 400, { error: e instanceof Error ? e.message : "작업 요청을 처리하지 못했습니다." }, origin);', "기본 오류는 400");
  has(queue, "throw new Error(`대기열에는 ${MAX_QUEUED}개까지 넣을 수 있습니다. 앞의 작업이 끝난 뒤 넣어 주세요.`);", "가득 참은 넣기 전");
  has(gateway, '{ error: "그림 작업 내용이 올바르지 않습니다." }', "사전 거절 문구");
  has(gateway, '{ error: "시드 값이 올바르지 않습니다." }', "사전 거절 문구");
  has(imageArt, 'throw new Error("그림 설명을 영어로 3단어 이상 적어 주세요(내 PC 그림 모델은 영어만 읽습니다).");', "사전 거절 문구");
  has(queue, "if (broken) throw new QueueClosedError(broken);", "닫힘은 넣기 전");
  // 끝난 기록 정리: 목록에 없다는 것만으로는 미접수가 아니다
  has(queue, "export const KEEP_FINISHED = 100;", "끝난 작업 보관 개수");
  has(queue, "export const KEEP_DAYS = 30;", "끝난 작업 보관 기간");
  has(queue, "createdAt: new Date().toISOString(),", "작업에 만든 시각");
  has(queue, "const { task: _task, fields: _fields, source: _source, ...rest } = j;", "목록에는 접수 번호가 남고 요청 원문은 빠짐");
  has(imageArt, "export const ART_PROMPT_LIMIT = 900;", "설명 길이");
  assert.equal(PROMPT_LIMIT, 900);
  assert.equal(SEED_MAX, 2147483647);
  // 허용 크기 목록이 엔진과 정확히 같은 세 개(순서 포함)
  const sizes = [...imageArt.slice(imageArt.indexOf("export const IMAGE_SIZES"), imageArt.indexOf("export const isImageSize")).matchAll(/\{ width: (\d+), height: (\d+) \}/g)].map((m) => [Number(m[1]), Number(m[2])]);
  assert.deepEqual(sizes, IMAGE_SIZES.map(([w, h]) => [w, h]));
});
