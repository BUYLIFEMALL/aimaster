// CRM-20261118-01 1단계 — 웹훅 중복 방지 순수 함수 시험(네트워크·DB 0, 새 패키지 0).
// 실행: node --test crm-google-form/tests/dedupe.test.mjs  (Node 22.18+/23.6+는 .ts를 그대로 불러옴)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_WEBHOOK_BODY_BYTES,
  MAX_EVENT_KEY_LENGTH,
  checkWebhookBodyBytes,
  classifyWebhookBody,
} from "../lib/crm/dedupe.ts";

const SRC_A = "11111111-1111-4111-8111-111111111111";
const SRC_B = "22222222-2222-4222-8222-222222222222";
const FILE = "1AbCdEfGhIjKlMnOpQrStUvWxYz_0123456789-ab";
const sheetKey = (row = 5, ts = "1794969285544", sheet = "0") => `${FILE}:${sheet}:${row}:${ts}`;
const v2 = (over = {}) => ({ v: 2, kind: "sheet", eventKey: sheetKey(), values: { 이름: ["홍길동"] }, ...over });

test("본문 크기: 실제 UTF-8 바이트로 잰다(글자 수 아님)", () => {
  assert.equal(MAX_WEBHOOK_BODY_BYTES, 65536);
  assert.deepEqual(checkWebhookBodyBytes("a".repeat(65536)), { ok: true, bytes: 65536 });
  assert.deepEqual(checkWebhookBodyBytes("a".repeat(65537)), { ok: false, status: 413, bytes: 65537 });
  // 한글 1자 = 3바이트: 21846자 = 65538바이트 → 초과
  assert.equal(checkWebhookBodyBytes("가".repeat(21845)).ok, true);
  assert.deepEqual(checkWebhookBodyBytes("가".repeat(21846)), { ok: false, status: 413, bytes: 65538 });
  assert.throws(() => checkWebhookBodyBytes(null), TypeError);
});

test("v2 시트: 정해진 형식이면 중복 키를 만든다", () => {
  const r = classifyWebhookBody(SRC_A, v2());
  assert.deepEqual(r, { type: "v2", formSourceId: SRC_A, kind: "sheet", dedupeKey: `v2:sheet:${sheetKey()}` });
});

test("v2 폼: 응답 ID 형식", () => {
  const r = classifyWebhookBody(SRC_A, v2({ kind: "form", eventKey: "2_ABaOnudR-x_y9Z" }));
  assert.deepEqual(r, { type: "v2", formSourceId: SRC_A, kind: "form", dedupeKey: "v2:form:2_ABaOnudR-x_y9Z" });
});

test("구버전(v 없음): 지금처럼 처리, 키 NULL — 모양 추정·해시 대체 0", () => {
  for (const body of [
    { responseId: "0f8fad5b-d9cb-469f-a165-70867728950e", values: { a: ["1"] } },
    { responseId: "2_ABaOnudR", values: {} },
    { values: { a: ["1"] } },
    {},
  ]) {
    assert.deepEqual(classifyWebhookBody(SRC_A, body), { type: "legacy", formSourceId: SRC_A, dedupeKey: null });
  }
});

test("버전: 숫자 2만 허용 — 문자열 '2'·모르는 버전·null은 400", () => {
  for (const v of ["2", 1, 3, 2.5, null, true, [2], { v: 2 }]) {
    const r = classifyWebhookBody(SRC_A, v2({ v }));
    assert.equal(r.type, "invalid", `v=${JSON.stringify(v)}`);
    assert.equal(r.status, 400);
    assert.equal(r.reason, "version");
  }
});

test("본문 자체: null·배열·문자열·숫자는 400", () => {
  for (const body of [null, undefined, [], [v2()], "x", 2]) {
    const r = classifyWebhookBody(SRC_A, body);
    assert.equal(r.type, "invalid");
    assert.equal(r.reason, "body");
  }
});

test("kind: 빈 값·모르는 값·대소문자 다름·비문자열은 400", () => {
  for (const kind of ["", "Sheet", "sheets", "range", null, undefined, 1, ["sheet"]]) {
    const r = classifyWebhookBody(SRC_A, v2({ kind }));
    assert.equal(r.type, "invalid", `kind=${JSON.stringify(kind)}`);
    assert.equal(r.reason, "kind");
  }
});

test("eventKey: 타입·빈 값·길이·금지 문자·앞뒤 공백(정규화하지 않음)은 400", () => {
  assert.equal(MAX_EVENT_KEY_LENGTH, 200);
  const bad = [
    null, undefined, 12345, ["a"], { a: 1 }, "",
    ` ${sheetKey()}`, `${sheetKey()} `, `${sheetKey()}\n`,
    " 2_ABaOnudR", "2_ABaOnudR ", "2_ABaOnudR\t", "\n2_ABaOnudR", // 정상 폼 키 + 공백 — 잘라내 통과시키지 않음
    "a".repeat(201),
  ];
  for (const eventKey of bad) {
    const r = classifyWebhookBody(SRC_A, v2({ kind: "form", eventKey }));
    assert.equal(r.type, "invalid", `form eventKey=${JSON.stringify(eventKey)}`);
    assert.equal(r.reason, "eventKey");
  }
  // 200자는 통과, 201자는 실패(폼)
  assert.equal(classifyWebhookBody(SRC_A, v2({ kind: "form", eventKey: "a".repeat(200) })).type, "v2");
  for (const eventKey of ["a/b", "a.b", "a b", "가나", "a%2F", "a:b"]) {
    assert.equal(classifyWebhookBody(SRC_A, v2({ kind: "form", eventKey })).reason, "eventKey", eventKey);
  }
});

test("시트 eventKey 형식: 파일ID:시트ID:행(1 이상):타임스탬프(13자리 밀리초) 하나만", () => {
  const bad = [
    `${FILE}:0:5`, // 시간 빠짐
    `${FILE}:0:0:1794969285544`, // 행 0
    `${FILE}:0:05:1794969285544`, // 앞자리 0(같은 행 다른 표기 방지)
    `${FILE}:x:5:1794969285544`, // 시트 ID 숫자 아님
    `${FILE}:0:5:179496928554`, // 12자리
    `${FILE}:0:5:2026-11-18T03:00:00Z`, // ISO 문자열
    `short:0:5:1794969285544`, // 파일 ID 너무 짧음
    `${FILE}:0:5:1794969285544:extra`,
  ];
  for (const eventKey of bad) {
    assert.equal(classifyWebhookBody(SRC_A, v2({ eventKey })).reason, "eventKey", eventKey);
  }
  assert.equal(classifyWebhookBody(SRC_A, v2({ eventKey: sheetKey(1, "1794969285544", "123456789") })).type, "v2");
});

test("values: v2는 일반 객체만(null·배열·문자열은 400)", () => {
  for (const values of [null, undefined, [], "a", 1]) {
    assert.equal(classifyWebhookBody(SRC_A, v2({ values })).reason, "values", JSON.stringify(values));
  }
});

test("같은 값·다른 행은 다른 키(정상 두 응답 손실 0), 같은 행·같은 시각은 같은 키", () => {
  const a = classifyWebhookBody(SRC_A, v2({ eventKey: sheetKey(5) }));
  const b = classifyWebhookBody(SRC_A, v2({ eventKey: sheetKey(6) }));
  const a2 = classifyWebhookBody(SRC_A, v2({ eventKey: sheetKey(5), values: { 이름: ["다른값"] } }));
  assert.notEqual(a.dedupeKey, b.dedupeKey);
  assert.equal(a.dedupeKey, a2.dedupeKey); // 키는 값이 아니라 이벤트 식별값만 본다
});

test("같은 키·다른 폼 연결은 범위가 달라 서로 간섭하지 않는다", () => {
  const a = classifyWebhookBody(SRC_A, v2());
  const b = classifyWebhookBody(SRC_B, v2());
  assert.equal(a.dedupeKey, b.dedupeKey);
  assert.notEqual(a.formSourceId, b.formSourceId);
});

test("시트·폼 kind는 같은 eventKey 문자열이어도 키가 갈린다", () => {
  const k = "a".repeat(30);
  const f = classifyWebhookBody(SRC_A, v2({ kind: "form", eventKey: k }));
  assert.equal(f.dedupeKey, `v2:form:${k}`);
});

test("formSourceId: UUID가 아니면 서버 오류로 던진다(호출 쪽 실수)", () => {
  for (const id of ["", "abc", null, undefined, 1]) {
    assert.throws(() => classifyWebhookBody(id, v2()), TypeError);
  }
});
