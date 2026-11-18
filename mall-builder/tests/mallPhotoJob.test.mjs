import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MALL_RESULT_NOT_READY, SKIP_MIRROR, SKIP_NO_PHOTO, SKIP_NO_REVISION, SKIP_NOT_MINE, SKIP_TOO_MANY, notReadyReply, planMallPhotoJob, sendMallJob,
} from "../src/lib/mallPhotoJob.ts";
import {
  PRODUCT_MALL_ORIGIN, PRODUCT_MSG_JOB, PRODUCT_MSG_READY, PRODUCT_MSG_RESULT, PRODUCT_RECEIVER_ORIGIN, PRODUCT_SENDER_ORIGIN,
  isProductReady, productBatchUrl, readProductJob, readProductResult, readProductSaved,
} from "../src/lib/productPhotoHandoff.ts";

// 메이커 M1(2026-11-19, Master msg_336575c1b8e9) — 작업 만들기·약속 계약 시험. 실제 창·네트워크·바나나·저장 0.
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const img = (n) => ({ url: `https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/mall-builder-public/s/products/p${n}.jpg` });
const row = (n, o = {}) => ({ id: U(n), name: `상품${n}`, images: [img(n)], source_product_id: null, updated_at: "2026-11-19T01:02:03.456789+00:00", ...o });

test("고른 순서·중복 1번·제외 이유(남의 상품·거울·사진 없음·수정 시각 없음)", () => {
  const rows = [row(1), row(2, { source_product_id: U(99) }), row(3, { images: [] }), row(4, { updated_at: null }), row(5)];
  const { items, skipped } = planMallPhotoJob(rows, [U(5), U(1), U(5), U(77), U(2), U(3), U(4)]);
  assert.deepEqual(items.map((i) => i.productId), [U(5), U(1)]);
  assert.deepEqual(skipped.map((s) => [s.productId, s.reason]), [[U(77), SKIP_NOT_MINE], [U(2), SKIP_MIRROR], [U(3), SKIP_NO_PHOTO], [U(4), SKIP_NO_REVISION]]);
});

test("사진: https만, 최대 4장, 첫 장 main·나머지 sub, baseRevision = updated_at", () => {
  const r = row(1, { images: [{ url: "http://x/a.jpg" }, img(1), { url: 3 }, img(2), img(3), img(4), img(5)] });
  const [it] = planMallPhotoJob([r], [U(1)]).items;
  assert.equal(it.photos.length, 4);
  assert.deepEqual(it.photos.map((p) => p.role), ["main", "sub", "sub", "sub"]);
  assert.ok(it.photos.every((p) => p.url.startsWith("https://")));
  assert.equal(it.baseRevision, "2026-11-19T01:02:03.456789+00:00");
  assert.equal(planMallPhotoJob([row(2, { images: [{ url: "http://only/insecure.jpg" }] })], [U(2)]).skipped[0].reason, SKIP_NO_PHOTO);
});

test("한 번에 50개까지 — 넘는 것은 이유와 함께 빠짐", () => {
  const rows = Array.from({ length: 52 }, (_, i) => row(i + 1));
  const { items, skipped } = planMallPhotoJob(rows, rows.map((r) => r.id));
  assert.equal(items.length, 50);
  assert.deepEqual(skipped.map((s) => s.reason), [SKIP_TOO_MANY, SKIP_TOO_MANY]);
});

test("만든 작업은 바나나 검사(readProductJob, 보낸 곳 = 쇼핑몰 운영 주소)를 그대로 통과 — 상세 주소로 보면 무시", () => {
  const [it] = planMallPhotoJob([row(1, { images: [img(1), img(2)] })], [U(1)]).items;
  const file = new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" });
  const msg = { type: PRODUCT_MSG_JOB, jobId: U(500), products: [{ productId: it.productId, label: it.label, baseRevision: it.baseRevision, photos: it.photos.map((p) => ({ role: p.role, ref: "x", file })) }] };
  const job = readProductJob(PRODUCT_MALL_ORIGIN, msg, PRODUCT_MALL_ORIGIN);
  assert.ok(job && !("error" in job));
  assert.equal(job.products[0].photos[0].role, "main");
  assert.equal(readProductJob(PRODUCT_MALL_ORIGIN, msg), null, "기본(상세) 주소 기대면 쇼핑몰 작업은 무시");
  assert.equal(productBatchUrl("mall"), `${PRODUCT_RECEIVER_ORIGIN}/batch?mode=product&from=mall`);
});

test("받는 쪽 검사: 바나나 주소·같은 작업 번호·보낸 상품만, 「준비됨」도 바나나 주소만", () => {
  const ids = new Set([U(1)]);
  const file = new Blob([new Uint8Array([1])], { type: "image/png" });
  const ok = { type: PRODUCT_MSG_RESULT, jobId: U(500), productId: U(1), file, settingsVersion: "c2", resultId: U(900) };
  assert.equal(readProductResult(PRODUCT_RECEIVER_ORIGIN, ok, U(500), ids).resultId, U(900));
  assert.equal(readProductResult(PRODUCT_SENDER_ORIGIN, ok, U(500), ids), null, "다른 주소");
  assert.equal(readProductResult(PRODUCT_RECEIVER_ORIGIN, ok, U(501), ids), null, "다른 작업 번호");
  assert.ok("error" in readProductResult(PRODUCT_RECEIVER_ORIGIN, { ...ok, productId: U(2) }, U(500), ids), "보내지 않은 상품");
  assert.equal(isProductReady(PRODUCT_RECEIVER_ORIGIN, { type: PRODUCT_MSG_READY }), true);
  assert.equal(isProductReady("https://evil.example", { type: PRODUCT_MSG_READY }), false);
});

test("M2 전 응답: ok false·고정 문구·결과 번호 그대로 — 바나나 readProductSaved가 정확히 읽음, 번호 없는 옛 결과는 번호 생략", () => {
  const r = notReadyReply(U(500), { productId: U(1), resultId: U(900), settingsVersion: "c2" });
  assert.deepEqual(r, { type: "aimaster-product-photos-saved", jobId: U(500), productId: U(1), ok: false, error: MALL_RESULT_NOT_READY, resultId: U(900), settingsVersion: "c2" });
  const seen = readProductSaved(PRODUCT_MALL_ORIGIN, r, U(500), PRODUCT_MALL_ORIGIN);
  assert.deepEqual(seen, { productId: U(1), ok: false, error: MALL_RESULT_NOT_READY, resultId: U(900), settingsVersion: "c2" });
  assert.equal("resultId" in notReadyReply(U(500), { productId: U(1), resultId: null, settingsVersion: "" }), false);
  assert.ok(MALL_RESULT_NOT_READY.length <= 200 && !/https?:|[0-9a-f]{8}-/.test(MALL_RESULT_NOT_READY), "고정 문구에 주소·번호 없음");
});

test("화면 소스 계약: 쇼핑몰 보낸 곳 주소로 열고, 바나나 주소로만 보내고, 그 창의 메시지만 받고, 저장 함수 호출 없음", () => {
  const src = readFileSync(new URL("../src/app/s/[store]/admin/products/banana-send.tsx", import.meta.url), "utf8");
  assert.match(src, /productBatchUrl\("mall"\)/);
  assert.match(src, /e\.source !== job\.win/);
  assert.match(src, /jobRef\.current === job && winRef\.current === job\.win && !job\.win\.closed/, "현재 작업·현재 창·열린 창일 때만");
  assert.match(src, /r\.state === "stale" \|\| !isActive\(job\)/, "늦게 끝난 옛 작업은 안내도 안 바꿈");
  assert.match(src, /window\.location\.origin !== PRODUCT_MALL_ORIGIN/);
  for (const m of src.matchAll(/postMessage\([^)]*?,\s*([A-Z_]+)\)/g)) assert.equal(m[1], "PRODUCT_RECEIVER_ORIGIN");
  assert.match(src, /if \(job\.sent\) return/);
  assert.doesNotMatch(src, /supabase|storage\.from|upload|Action\(/, "M1은 저장·업로드 0");
});

// ── P2(Master msg_4ab005ab0d96): 오래된 비동기 작업과 새 창·새 작업 분리 — 모의 창·모의 사진(네트워크 0)
const deferred = () => { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; };
const fakeWin = () => { const sent = []; return { sent, postMessage: (msg, origin) => sent.push({ msg, origin }) }; };
const blob = () => new Blob([new Uint8Array([1])], { type: "image/jpeg" });
const two = () => planMallPhotoJob([row(1), row(2, { images: [img(2), img(3)] })], [U(1), U(2)]).items;

test("정상 송신: 활성인 동안 사진을 모두 읽고 바나나 주소로 작업 1통(그 작업 번호)", async () => {
  const win = fakeWin();
  const r = await sendMallJob({ jobId: U(600), items: two(), win, isActive: () => true, fetchPhoto: async () => blob(), mark: () => {} });
  assert.deepEqual(r, { state: "sent", sentIds: [U(1), U(2)] });
  assert.equal(win.sent.length, 1);
  assert.equal(win.sent[0].origin, PRODUCT_RECEIVER_ORIGIN);
  assert.equal(win.sent[0].msg.jobId, U(600));
  assert.deepEqual(win.sent[0].msg.products.map((p) => p.photos.length), [1, 2]);
  const job = readProductJob(PRODUCT_MALL_ORIGIN, win.sent[0].msg, PRODUCT_MALL_ORIGIN);
  assert.ok(job && !("error" in job), "바나나 검사 통과");
});

test("늦은 완료 반례: 사진을 기다리는 사이 새 작업이 시작되면 옛 작업은 보내기 0·표시 0", async () => {
  const win = fakeWin(); const marks = []; const d = deferred(); let active = true;
  const run = sendMallJob({ jobId: U(601), items: two(), win, isActive: () => active, fetchPhoto: () => d.p, mark: (id, t) => marks.push([id, t]) });
  active = false; // 새 작업 시작(또는 창 닫힘)
  d.res(blob());
  assert.deepEqual(await run, { state: "stale", sentIds: [] });
  assert.equal(win.sent.length, 0, "옛 작업이 창에 보내지 않음");
  assert.deepEqual(marks, [[U(1), "사진 읽는 중"]], "기다린 뒤에는 상태 표시도 하지 않음");
});

test("늦은 실패 반례: 새 작업 뒤 옛 작업 사진이 실패해도 실패 표시·보내기 0", async () => {
  const win = fakeWin(); const marks = []; const d = deferred(); let active = true;
  const run = sendMallJob({ jobId: U(602), items: two(), win, isActive: () => active, fetchPhoto: () => d.p, mark: (id, t) => marks.push([id, t]) });
  active = false; d.rej(new Error("사진을 불러오지 못했습니다."));
  assert.equal((await run).state, "stale");
  assert.equal(win.sent.length, 0);
  assert.deepEqual(marks, [[U(1), "사진 읽는 중"]]);
});

test("다음 상품으로 넘어가기 전에 비활성이 되면 거기서 멈춤(앞 상품도 보내지 않음)", async () => {
  const win = fakeWin(); let n = 0;
  const r = await sendMallJob({ jobId: U(603), items: two(), win, isActive: () => n++ < 2, fetchPhoto: async () => blob(), mark: () => {} });
  assert.equal(r.state, "stale"); assert.equal(win.sent.length, 0);
});

test("활성 중 일부 실패: 실패 상품은 표시하고 빼고 나머지만 1통 / 전부 실패면 empty·보내기 0", async () => {
  const win = fakeWin(); const marks = [];
  const r = await sendMallJob({ jobId: U(604), items: two(), win, isActive: () => true,
    fetchPhoto: async (u) => { if (u.endsWith("/p1.jpg")) throw new Error("25MB 이하 사진만 보낼 수 있습니다."); return blob(); },
    mark: (id, t) => marks.push([id, t]) });
  assert.deepEqual(r, { state: "sent", sentIds: [U(2)] });
  assert.equal(win.sent.length, 1);
  assert.deepEqual(win.sent[0].msg.products.map((p) => p.productId), [U(2)]);
  assert.ok(marks.some(([id, t]) => id === U(1) && t === "25MB 이하 사진만 보낼 수 있습니다."));
  const w2 = fakeWin();
  const r2 = await sendMallJob({ jobId: U(605), items: two(), win: w2, isActive: () => true, fetchPhoto: async () => { throw new Error("x"); }, mark: () => {} });
  assert.deepEqual(r2, { state: "empty", sentIds: [] }); assert.equal(w2.sent.length, 0);
});
