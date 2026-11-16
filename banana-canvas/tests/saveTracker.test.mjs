// ECOM-17 저장 확인 약속 시험 — 결과 번호(resultId) 정확 일치·늦은 옛 응답·실패·중복·순서 역전·옛 응답·새 작업·같은 작업 사진 변경·계약 읽기.
import test from "node:test";
import assert from "node:assert/strict";
import {
  alreadySaved, applyAck, blockReason, createSaveTracker, isUncertain, pendingCount, photoFingerprint, recordSend, resetForJob, resultKeyOf,
} from "../src/lib/batch/saveTracker.ts";
import { readProductResult, readProductSaved, PRODUCT_RECEIVER_ORIGIN, PRODUCT_SENDER_ORIGIN } from "../src/lib/productPhotoHandoff.ts";

const P = "aaaaaaaa-1111-4111-8111-111111111111";
const Q = "bbbbbbbb-2222-4222-8222-222222222222";
const J1 = "11111111-3333-4333-8333-333333333333";
const J2 = "22222222-3333-4333-8333-333333333333";
let n = 0;
const id = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
const setup = () => { const t = createSaveTracker(); resetForJob(t, J1, new Map([[P, "fpA"], [Q, "fpB"]])); return t; };

test("MOV-11 ① 늦은 V1 성공이 V2로 오인되지 않고, V2 실패 뒤엔 V2를 다시 보낸다", () => {
  const t = setup();
  const k1 = resultKeyOf(t, P, "c2-v1"), k2 = resultKeyOf(t, P, "c2-v2");
  const r1 = recordSend(t, P, k1, id);
  const r2 = recordSend(t, P, k2, id);
  assert.equal(applyAck(t, { productId: P, ok: true, resultId: r1 }).kind, "matched"); // 늦게 온 V1 성공
  assert.equal(alreadySaved(t, P, k2), false); // V2는 저장된 것 아님(대기 중)
  applyAck(t, { productId: P, ok: false, resultId: r2 }); // V2 실패
  assert.equal(pendingCount(t, P), 0);
  assert.equal(alreadySaved(t, P, k2), false); // → V2 다시 보냄
  assert.equal(alreadySaved(t, P, k1), true); // 마지막 저장은 V1
});

test("순서 역전: V2 성공이 먼저, V1 성공이 나중에 와도 마지막 저장은 V2", () => {
  const t = setup();
  const k1 = resultKeyOf(t, P, "c2-v1"), k2 = resultKeyOf(t, P, "c2-v2");
  const r1 = recordSend(t, P, k1, id), r2 = recordSend(t, P, k2, id);
  applyAck(t, { productId: P, ok: true, resultId: r2 });
  applyAck(t, { productId: P, ok: true, resultId: r1 });
  assert.equal(alreadySaved(t, P, k2), true);
  assert.equal(alreadySaved(t, P, k1), false);
});

test("중복 응답·다른 상품·모르는 번호는 무시, 실패는 그 결과에만", () => {
  const t = setup();
  const k = resultKeyOf(t, P, "c2-v1");
  const r = recordSend(t, P, k, id);
  assert.equal(applyAck(t, { productId: Q, ok: true, resultId: r }).kind, "ignored"); // 다른 상품 오염
  assert.equal(applyAck(t, { productId: P, ok: true, resultId: id() }).kind, "ignored"); // 모르는 번호
  assert.equal(applyAck(t, { productId: P, ok: true, resultId: r }).kind, "matched");
  assert.equal(applyAck(t, { productId: P, ok: false, resultId: r }).kind, "ignored"); // 중복(늦은 실패)이 저장을 덮지 않음
  assert.equal(alreadySaved(t, P, k), true);
  const rq = recordSend(t, Q, resultKeyOf(t, Q, "c2-v1"), id);
  applyAck(t, { productId: Q, ok: false, resultId: rq });
  assert.equal(alreadySaved(t, P, k), true); // Q 실패가 P에 영향 없음
});

test("옛 응답(resultId 없음)은 「확인 필요」 — 자동 재전송 판단에서 저장으로 보지 않음, 정확한 최신 응답이 오면 풀림", () => {
  const t = setup();
  const k = resultKeyOf(t, P, "c2-v1");
  const r = recordSend(t, P, k, id);
  assert.equal(applyAck(t, { productId: P, ok: true, resultId: null }).kind, "legacy");
  assert.equal(isUncertain(t, P), true);
  assert.equal(alreadySaved(t, P, k), false);
  applyAck(t, { productId: P, ok: true, resultId: r });
  assert.equal(isUncertain(t, P), false);
  assert.equal(alreadySaved(t, P, k), true);
});

test("새 작업은 기록을 비우고, 같은 작업에서 사진 내용 지문이 바뀌면 그 상품만 비운다", () => {
  const t = setup();
  const kP = resultKeyOf(t, P, "c2-v1"), kQ = resultKeyOf(t, Q, "c2-v1");
  applyAck(t, { productId: P, ok: true, resultId: recordSend(t, P, kP, id) });
  applyAck(t, { productId: Q, ok: true, resultId: recordSend(t, Q, kQ, id) });
  const late = recordSend(t, P, kP, id);
  resetForJob(t, J1, new Map([[P, "fpA2"], [Q, "fpB"]])); // 같은 작업, P 사진만 바뀜
  assert.equal(alreadySaved(t, P, resultKeyOf(t, P, "c2-v1")), false);
  assert.equal(alreadySaved(t, Q, kQ), true);
  assert.equal(applyAck(t, { productId: P, ok: true, resultId: late }).kind, "ignored"); // 옛 입력 결과의 늦은 응답 무시
  resetForJob(t, J2, new Map([[P, "fpA2"]]));
  assert.equal(alreadySaved(t, Q, kQ), false);
  assert.equal(t.sends.size, 0);
});

test("내용 지문: 크기·형식이 같아도 내용이 다르면 다르다", async () => {
  const a = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" });
  const b = new Blob([new Uint8Array([1, 2, 3, 5])], { type: "image/png" });
  const fa = await photoFingerprint([{ role: "main", file: a }]);
  assert.equal(fa, await photoFingerprint([{ role: "main", file: new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" }) }]));
  assert.notEqual(fa, await photoFingerprint([{ role: "main", file: b }]));
  assert.notEqual(fa, await photoFingerprint([{ role: "sub", file: a }]));
});

test("계약 읽기: resultId(UUID만)·settingsVersion, 옛 메시지는 null, 주소·작업 다르면 무시", () => {
  const rid = id();
  const saved = readProductSaved(PRODUCT_SENDER_ORIGIN, { type: "aimaster-product-photos-saved", jobId: J1, productId: P, ok: true, resultId: rid, settingsVersion: "c2-x" }, J1);
  assert.deepEqual(saved, { productId: P, ok: true, error: "", resultId: rid, settingsVersion: "c2-x" });
  assert.equal(readProductSaved(PRODUCT_SENDER_ORIGIN, { type: "aimaster-product-photos-saved", jobId: J1, productId: P, ok: true }, J1).resultId, null);
  assert.equal(readProductSaved(PRODUCT_SENDER_ORIGIN, { type: "aimaster-product-photos-saved", jobId: J1, productId: P, ok: true, resultId: "not-uuid" }, J1).resultId, null);
  assert.equal(readProductSaved("https://evil.example", { type: "aimaster-product-photos-saved", jobId: J1, productId: P, ok: true }, J1), null);
  assert.equal(readProductSaved(PRODUCT_SENDER_ORIGIN, { type: "aimaster-product-photos-saved", jobId: J2, productId: P, ok: true }, J1), null);
  const file = new Blob([new Uint8Array([1])], { type: "image/png" });
  const res = readProductResult(PRODUCT_RECEIVER_ORIGIN, { type: "aimaster-product-photos-result", jobId: J1, productId: P, file, settingsVersion: "c2-x", resultId: rid }, J1, new Set([P]));
  assert.equal(res.resultId, rid);
  assert.equal(readProductResult(PRODUCT_RECEIVER_ORIGIN, { type: "aimaster-product-photos-result", jobId: J1, productId: P, file, settingsVersion: "c2-x" }, J1, new Set([P])).resultId, null);
});

test("MOV17-02: 응답 대기 중이면 같은 판·다른 판 모두 자동 전송을 막고, 정확한 응답으로 풀리며, 다른 상품은 독립", () => {
  const t = setup();
  const k1 = resultKeyOf(t, P, "c2-v1");
  assert.equal(blockReason(t, P), null);
  const r1 = recordSend(t, P, k1, id);
  assert.equal(blockReason(t, P), "pending"); // 같은 판 재합성·다른 판 모두 자동 전송 막힘
  assert.equal(alreadySaved(t, P, k1), false); // 대기를 저장으로 멋대로 바꾸지 않음
  assert.equal(blockReason(t, Q), null); // 다른 상품은 영향 없음
  applyAck(t, { productId: P, ok: true, resultId: r1 });
  assert.equal(blockReason(t, P), null);
  assert.equal(alreadySaved(t, P, k1), true);
  const r2 = recordSend(t, P, resultKeyOf(t, P, "c2-v2"), id);
  applyAck(t, { productId: P, ok: false, resultId: r2 }); // 실패도 대기를 정확히 풀어 줌
  assert.equal(blockReason(t, P), null);
  assert.equal(alreadySaved(t, P, k1), true); // 마지막 저장은 여전히 v1
});

test("옛 응답 확인 필요는 대기보다 먼저 보이고, 최신 결과의 정확한 성공 응답으로만 풀린다", () => {
  const t = setup();
  const r1 = recordSend(t, P, resultKeyOf(t, P, "c2-v1"), id);
  const r2 = recordSend(t, P, resultKeyOf(t, P, "c2-v2"), id);
  applyAck(t, { productId: P, ok: true, resultId: null });
  assert.equal(blockReason(t, P), "uncertain");
  applyAck(t, { productId: P, ok: true, resultId: r1 }); // 최신(r2)이 아니므로 확인 필요 유지
  assert.equal(blockReason(t, P), "uncertain");
  applyAck(t, { productId: P, ok: true, resultId: r2 });
  assert.equal(blockReason(t, P), null);
});
