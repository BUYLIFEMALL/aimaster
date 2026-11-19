// 맥미니 686b9773f 검수: 요청 경계(정확한 출처·바이트 상한·동의 표시)와 장수 보존, 중복 누름 억제. 합성 대역만.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { MAX_BODY_BYTES, handleConvertPost, readLimitedText, sameOrigin } from "../src/lib/convert/handler.ts";
import { CONVERT_MAX_ITEMS, ConvertError, KO_LIMIT, endsLikeCopiesMark, parseResponse } from "../src/lib/convert/protocol.ts";
import { applyConverted, linesToConvert, singleFlight } from "../src/lib/convert/client.ts";
import { COPIES_MAX, buildPlan, parseEntries } from "../src/lib/studio/batch.ts";
import { findPreset } from "../src/lib/studio/presets.ts";

const SITE = "https://free-image-studio.example.test";
const URL_ = `${SITE}/api/convert`;
const FAKE_KEY = "synthetic-test-key-not-real";
const ITEMS = [{ id: "aaaaaa01", ko: "식탁 위의 빨간 사과" }];
const GOOD = { items: [{ id: "aaaaaa01", en: "a red apple on a dining table" }] };
const bodyOf = (over = {}) => JSON.stringify({ consent: true, model: "claude-haiku-5-5", items: ITEMS, ...over });

/** 판정·키 읽기·AI 호출을 세는 대역 */
function world({ allowed = true, key = FAKE_KEY, reply = GOOD } = {}) {
  const seen = { access: 0, keys: [], ai: 0 };
  const deps = {
    checkAccess: async () => (seen.access++, allowed ? { allowed: true, userId: "user-1" } : { allowed: false, error: "로그인이 필요합니다.", status: 401 }),
    getKey: async (userId, provider) => (seen.keys.push([userId, provider]), key),
    fetcher: async () => (seen.ai++, new Response(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(reply) }], stop_reason: "end_turn" }), { status: 200 })),
    now: () => new Date("2026-11-19T00:00:00Z"),
  };
  return { seen, deps };
}
const post = (body, headers = {}) => new Request(URL_, { method: "POST", headers: { origin: SITE, "content-type": "application/json", ...headers }, body });
/** 조각으로 흘려보내는 본문. pulled는 실제로 꺼내 간 조각 수, cancelled는 읽기를 끊었는지 */
function streamed(chunks, headers = {}) {
  const state = { pulled: 0, cancelled: false };
  let i = 0;
  const stream = new ReadableStream({
    pull(controller) {
      if (i >= chunks.length) return controller.close();
      state.pulled += 1;
      controller.enqueue(chunks[i++]);
    },
    cancel() {
      state.cancelled = true;
    },
  }, { highWaterMark: 0 });
  return { state, request: new Request(URL_, { method: "POST", headers: { origin: SITE, ...headers }, body: stream, duplex: "half" }) };
}
const nothingHappened = (seen) => assert.deepEqual([seen.keys.length, seen.ai], [0, 0], "키 조회 0 · AI 호출 0");

test("반례 P2 — 출처는 스킴·호스트·포트가 모두 같은 정확한 origin만. 어긋나면 키 조회·AI 호출 0", async () => {
  assert.equal(sameOrigin(SITE, URL_), true);
  const bad = [
    null, undefined, "", "null",
    "http://free-image-studio.example.test", // 스킴이 다름(예전 검사는 호스트만 봐서 통과했다)
    "https://free-image-studio.example.test:8443", // 포트가 다름
    "https://evil.example.test",
    "https://free-image-studio.example.test.evil.example", // 뒤에 붙인 이름
    "https://sub.free-image-studio.example.test",
    `${SITE}/`, `${SITE}/path`, `${SITE}?x=1`, // Origin 머리글 모양이 아님
    "free-image-studio.example.test", "not a url", "javascript:alert(1)", "file://",
  ];
  for (const origin of bad) {
    assert.equal(sameOrigin(origin, URL_), false, String(origin));
    const { seen, deps } = world();
    const headers = origin === null || origin === undefined ? { origin: "" } : { origin };
    const req = new Request(URL_, { method: "POST", headers, body: bodyOf() });
    if (origin === null || origin === undefined) req.headers.delete("origin");
    const r = await handleConvertPost(req, deps);
    assert.deepEqual([r.status, r.body.code], [403, "origin"], String(origin));
    nothingHappened(seen);
  }
  // 기본 포트를 적은 것은 같은 origin이다. 포트가 있는 주소(내 PC 개발)도 포트까지 같아야 한다.
  assert.equal(sameOrigin("https://free-image-studio.example.test:443", URL_), false, "머리글에 기본 포트를 붙여 보낸 것은 브라우저가 보내는 모양이 아니다");
  assert.equal(sameOrigin("http://localhost:3000", "http://localhost:3000/api/convert"), true);
  assert.equal(sameOrigin("http://localhost:3001", "http://localhost:3000/api/convert"), false);
  assert.equal(sameOrigin("http://127.0.0.1:3000", "http://localhost:3000/api/convert"), false);
  // 정상 출처는 통과
  const { seen, deps } = world();
  const ok = await handleConvertPost(post(bodyOf()), deps);
  assert.deepEqual([ok.status, ok.body.items], [200, GOOD.items]);
  assert.deepEqual(seen.keys, [["user-1", "anthropic"]]);
  assert.equal(seen.ai, 1);
});

test("처리 순서 — 권한이 없으면 출처·본문을 보지 않고, 어느 단계에서 걸려도 키 조회·AI 호출은 0", async () => {
  // 권한 없음: 본문을 꺼내 가지 않는다
  const s = streamed([new TextEncoder().encode(bodyOf())]);
  const w = world({ allowed: false });
  const r = await handleConvertPost(s.request, w.deps);
  assert.deepEqual([r.status, r.body.code], [401, "access"]);
  assert.equal(s.state.pulled, 0, "본문을 읽지 않았다");
  nothingHappened(w.seen);
  // 출처가 틀리면 본문을 꺼내 가지 않고 끊는다
  const s2 = streamed([new TextEncoder().encode(bodyOf())], { origin: "https://evil.example.test" });
  const w2 = world();
  assert.equal((await handleConvertPost(s2.request, w2.deps)).status, 403);
  assert.equal(s2.state.pulled, 0);
  nothingHappened(w2.seen);
  // 본문·동의·요청 내용이 틀린 경우들
  const cases = [
    ["{bad json", 400, "invalid"], ["", 400, "invalid"], ["null", 400, "needConsent"], ["[]", 400, "needConsent"],
    [JSON.stringify({ model: "claude-haiku-5-5", items: ITEMS }), 400, "needConsent"],
    [bodyOf({ consent: "true" }), 400, "needConsent"], [bodyOf({ consent: 1 }), 400, "needConsent"], [bodyOf({ consent: false }), 400, "needConsent"],
    [bodyOf({ model: "gpt-6-astra" }), 400, "invalid"], [bodyOf({ items: [] }), 400, "invalid"],
  ];
  for (const [body, status, code] of cases) {
    const x = world();
    const res = await handleConvertPost(post(body), x.deps);
    assert.deepEqual([res.status, res.body.code], [status, code], body.slice(0, 40));
    nothingHappened(x.seen);
  }
  // 키가 없으면 AI 호출 0
  const nk = world({ key: null });
  const res = await handleConvertPost(post(bodyOf()), nk.deps);
  assert.deepEqual([res.status, res.body.code], [400, "needKey"]);
  assert.equal(nk.seen.ai, 0);
  // 예상하지 못한 오류(키 읽기 실패)는 원문을 내보내지 않는다
  const boom = world();
  boom.deps.getKey = async () => { throw new Error("db password=hunter2 " + FAKE_KEY); };
  const e = await handleConvertPost(post(bodyOf()), boom.deps);
  assert.deepEqual([e.status, e.body.code], [500, "error"]);
  assert.ok(!JSON.stringify(e.body).includes("hunter2") && !JSON.stringify(e.body).includes(FAKE_KEY));
  assert.equal(boom.seen.ai, 0);
});

test("반례 P2 — 본문 상한은 바이트로, 읽는 도중 넘으면 끊는다. 넘은 요청은 키 조회·AI 호출 0", async () => {
  const enc = new TextEncoder();
  // 가장 큰 정상 요청(24줄 × 한글 300자)은 통과한다 — 글자 수로는 약 7,900자지만 바이트로는 약 23KB
  const maxItems = Array.from({ length: CONVERT_MAX_ITEMS }, (_, i) => ({ id: `bbbbbb${String(i).padStart(10, "0")}`, ko: "가".repeat(KO_LIMIT) }));
  const maxBody = bodyOf({ items: maxItems });
  const maxBytes = enc.encode(maxBody).byteLength;
  assert.ok(maxBody.length < 12_000 && maxBytes > 20_000 && maxBytes <= MAX_BODY_BYTES, `글자 ${maxBody.length} · 바이트 ${maxBytes} · 상한 ${MAX_BODY_BYTES}`);
  const reply = { items: maxItems.map((it) => ({ id: it.id, en: "a small red apple on a table" })) };
  const big = world({ reply });
  assert.equal((await handleConvertPost(post(maxBody), big.deps)).status, 200, "정상 최대 묶음은 받는다");
  assert.equal(big.seen.ai, 1);
  // 글자 수는 상한보다 적지만 바이트가 넘는 본문(한글 3바이트) — 글자 수로 세던 예전 검사는 통과시켰다
  const overByBytes = JSON.stringify({ consent: true, model: "claude-haiku-5-5", items: ITEMS, pad: "가".repeat(Math.ceil(MAX_BODY_BYTES / 3) + 10) });
  assert.ok(overByBytes.length < MAX_BODY_BYTES && enc.encode(overByBytes).byteLength > MAX_BODY_BYTES);
  const w = world();
  const r = await handleConvertPost(post(overByBytes), w.deps);
  assert.deepEqual([r.status, r.body.code], [413, "invalid"]);
  nothingHappened(w.seen);
  // 경계: 정확히 상한 바이트는 읽고, 1바이트 더는 거절
  const exact = new Uint8Array(MAX_BODY_BYTES).fill(0x20);
  assert.deepEqual(await readLimitedText(new Request(URL_, { method: "POST", body: exact }), MAX_BODY_BYTES).then((x) => ("text" in x ? x.text.length : x.problem)), MAX_BODY_BYTES);
  assert.deepEqual(await readLimitedText(new Request(URL_, { method: "POST", body: new Uint8Array(MAX_BODY_BYTES + 1).fill(0x20) }), MAX_BODY_BYTES), { problem: "tooLarge" });
  // Content-Length가 상한을 넘으면 본문을 꺼내지 않는다
  const declared = streamed([enc.encode("x")], { "content-length": String(MAX_BODY_BYTES + 1) });
  assert.deepEqual(await readLimitedText(declared.request, MAX_BODY_BYTES), { problem: "tooLarge" });
  assert.equal(declared.state.pulled, 0);
  assert.equal(declared.state.cancelled, true);
  for (const bad of ["abc", "-1", "NaN"]) assert.deepEqual(await readLimitedText(streamed([enc.encode("x")], { "content-length": bad }).request, MAX_BODY_BYTES), { problem: "unreadable" });
  // Content-Length 없이(또는 작게 속여) 흘려보내는 큰 본문: 넘는 순간 끊고 나머지 조각은 꺼내지 않는다
  const chunk = new Uint8Array(8 * 1024).fill(0x61);
  const flood = streamed(Array.from({ length: 64 }, () => chunk));
  const fw = world();
  const fr = await handleConvertPost(flood.request, fw.deps);
  assert.deepEqual([fr.status, fr.body.code], [413, "invalid"]);
  assert.ok(flood.state.pulled <= 6, `상한을 넘긴 뒤 더 꺼내지 않는다(꺼낸 조각 ${flood.state.pulled}개)`);
  assert.equal(flood.state.cancelled, true);
  nothingHappened(fw.seen);
  // UTF-8: 조각 경계에서 한글이 잘려 와도 온전히 읽고, 깨진 바이트는 받지 않는다
  const bytes = enc.encode(bodyOf());
  const cut = bytes.indexOf(0xec) + 1; // 한글 첫 바이트 뒤에서 자른다
  const split = streamed([bytes.slice(0, cut), bytes.slice(cut)]);
  const sw = world();
  assert.equal((await handleConvertPost(split.request, sw.deps)).status, 200);
  assert.deepEqual(JSON.parse(JSON.stringify(sw.seen.keys)), [["user-1", "anthropic"]]);
  const broken = new Uint8Array([...enc.encode('{"consent":true,"x":"'), 0xff, 0xfe, ...enc.encode('"}')]);
  const bw = world();
  const br = await handleConvertPost(post(broken), bw.deps);
  assert.deepEqual([br.status, br.body.code], [400, "invalid"]);
  nothingHappened(bw.seen);
  assert.deepEqual(await readLimitedText(new Request(URL_, { method: "POST" }), MAX_BODY_BYTES), { text: "" });
});

test("반례 P2 — 변환 결과가 장수를 바꾸지 못한다: 줄 끝이 장수 표시로 읽히는 영문은 서버·화면 모두 거절(실제 묶음 파서 기준)", () => {
  // 실제 파서가 장수 표시로 읽는 끝모양
  for (const en of ["blue camera model X2", "blue camera model x2", "a red apple on a table ×2", "a red apple on a table *2", "a red apple on a table x 2", "a red apple on a table X9", "big poster layout x10"]) {
    assert.equal(endsLikeCopiesMark(en), true, en);
    assert.notEqual(parseEntries(en)[0].source, en, en + ": 파서가 실제로 낱말을 떼어 낸다");
    const sent = [{ id: "aaaaaa01", ko: "파란 카메라 모델 엑스투" }];
    assert.throws(() => parseResponse(JSON.stringify({ items: [{ id: "aaaaaa01", en }] }), sent), (e) => e instanceof ConvertError && e.code === "mismatch" && (/[^\x20-\x7e]/.test(en) ? /영문이 아닌 글자/ : /장수 표시/).test(e.message), en); // 「×」는 영문 글자 검사에서 먼저 걸린다
  }
  // 장수 표시가 아닌 것
  for (const en of ["the X2 model camera in blue", "a camera called modelx2", "two red apples on a table", "apple 2x zoom lens photo", "a poster with x2 in the middle"]) {
    assert.equal(endsLikeCopiesMark(en), false, en);
    assert.equal(parseEntries(en)[0].source, en, en);
  }
  // 화면 쪽: 서버 검사를 거치지 않은 결과가 와도 장수를 바꾸지 않는다
  const cases = [
    ["파란 카메라 모델 엑스투", 1],
    ["파란 카메라 모델 엑스투 x2", 2],
    ["파란 카메라 모델 엑스투 ×2", 2],
    ["파란 카메라 모델 엑스투 x1", 1],
  ];
  for (const [line, copies] of cases) {
    const text = `a red apple on a table\n${line}`;
    const sent = linesToConvert(text, () => "cccccc01").items;
    assert.equal(parseEntries(text)[1].copies, copies);
    // 조작된 결과(끝이 X2): 한 줄도 바꾸지 않는다
    assert.throws(() => applyConverted(text, sent, [{ id: "cccccc01", en: "blue camera model X2" }]), /장수/, line);
    // 정상 결과: 설명은 영문 그대로, 장수는 변환 전 그대로
    const out = applyConverted(text, sent, [{ id: "cccccc01", en: "the X2 model camera in blue" }]);
    const after = parseEntries(out.text)[1];
    assert.deepEqual([after.source, after.copies, after.badCopies], ["the X2 model camera in blue", copies, undefined], line);
    const before = buildPlan({ text: `a red apple on a table\nplaceholder words here${copies === 2 ? " x2" : ""}`, preset: findPreset("photo"), width: 1280, height: 720 }).total;
    assert.equal(buildPlan({ text: out.text, preset: findPreset("photo"), width: 1280, height: 720 }).total, before, "맡길 장수가 변환 전과 같다");
  }
  // 잘못된 장수 표시(x9)가 붙은 줄: 변환해도 잘못된 표시 그대로 남아 계속 막힌다(몰래 1장·2장이 되지 않는다)
  const badText = "식탁 위의 빨간 사과 x9";
  const sentBad = linesToConvert(badText, () => "cccccc01").items;
  const outBad = applyConverted(badText, sentBad, [{ id: "cccccc01", en: "a red apple on a dining table" }]);
  assert.equal(parseEntries(outBad.text)[0].badCopies, 9);
  assert.ok(9 > COPIES_MAX && buildPlan({ text: outBad.text, preset: findPreset("photo"), width: 1280, height: 720 }).errors.length > 0);
  // 변환하는 사이 사용자가 장수만 바꾼 줄: 설명이 같으면 바꾸되, 사용자가 새로 정한 장수를 따른다
  const sent1 = linesToConvert("식탁 위의 빨간 사과", () => "cccccc01").items;
  const edited = applyConverted("식탁 위의 빨간 사과 x2", sent1, [{ id: "cccccc01", en: "a red apple on a dining table" }]);
  assert.deepEqual([parseEntries(edited.text)[0].source, parseEntries(edited.text)[0].copies], ["a red apple on a dining table", 2]);
});

test("중복 누름 억제 — 한 화면 안에서는 실행 중 다시 불러도 한 번만. 범위는 그 화면(탭) 하나", async () => {
  const gate = singleFlight();
  let calls = 0;
  let open;
  const held = new Promise((res) => (open = res));
  const work = async () => (calls++, await held, "done");
  const first = gate.run(work);
  assert.equal(gate.running, true);
  const second = await gate.run(work); // 실행 중에 다시 누름
  const third = await gate.run(work);
  assert.deepEqual([second, third], [null, null], "기다렸다가 다시 실행하지도 않는다");
  assert.equal(calls, 1);
  open();
  assert.equal(await first, "done");
  assert.equal(gate.running, false);
  assert.equal(await gate.run(async () => (calls++, "again")), "again", "끝난 뒤에는 다시 누를 수 있다");
  // 실패해도 문이 다시 열린다(멈춰 버리지 않는다)
  await assert.rejects(gate.run(async () => { throw new Error("x"); }));
  assert.equal(gate.running, false);
  // 문은 화면마다 따로다 — 탭 두 개는 서로 막지 않는다(문서에 밝힌 범위)
  const other = singleFlight();
  const a = gate.run(async () => (await held, 1));
  assert.equal(await other.run(async () => 2), 2);
  await a;
  // 화면: 누르는 순간 문을 거치고, 동의·켜짐·키 조건을 한 번 더 본다. 요청에는 동의 표시를 붙인다.
  const read = (rel) => readFile(new URL(rel, import.meta.url), "utf8");
  const panel = await read("../src/components/studio/ConvertPanel.tsx");
  assert.ok(panel.includes("const gate = useRef(singleFlight()).current;"));
  assert.ok(/const convert = \(\) =>\s+gate\.run\(async \(\) => \{\s+\/\/[^\n]*\n\s+if \(disabled \|\| !model \|\| !canConvert\(settings, status, pending\)\) return;/.test(panel));
  const client = await read("../src/lib/convert/client.ts");
  assert.ok(client.includes("body: JSON.stringify({ consent: true, model, items:"));
  // 경로 파일은 처리 순서를 handler에 맡긴다(같은 순서가 시험된 그대로 운영에 쓰인다)
  const route = await read("../src/app/api/convert/route.ts");
  assert.ok(route.includes("handleConvertPost(request, { checkAccess, getKey: getUserApiKey })"));
  assert.ok(!/request\.text\(\)|\.host\b/.test(route), "경로 파일이 본문을 통째로 읽거나 호스트만 비교하지 않는다");
  const handler = await read("../src/lib/convert/handler.ts");
  assert.ok(!/request\.text\(\)|request\.json\(\)/.test(handler), "본문은 바이트 상한 안에서만 읽는다");
});
