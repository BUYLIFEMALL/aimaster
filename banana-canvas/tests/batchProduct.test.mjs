// 메이커 P1 「🛍 상품 대표사진 합성」 계산 시험 — 작업표 읽기·짝짓기·검사·파일 이름·결과표·배치(그리기는 브라우저에서만)
import test from "node:test";
import assert from "node:assert/strict";
import { buildJobs, compositeNames, manifestCsv, manifestJson, parseTable, roleFromFileName, rowsFromFileNames, safePart } from "../src/lib/batch/productJobs.ts";
import { DEFAULT_COMPOSITE, fitRect, mainBox, normalizeComposite, settingsVersion, subRects } from "../src/lib/batch/composite.ts";

test("F1 작업표: 머리줄 별칭·엑셀(탭)·CSV 따옴표·빈 코드 오류", () => {
  const t = parseTable("상품코드\t옵션\t대표사진\t서브1\nA-1\t화이트\ta.jpg\ta2.jpg\n\t\tx.jpg\n");
  assert.equal(t.rows.length, 1);
  assert.deepEqual({ ...t.rows[0], line: 0 }, { code: "A-1", option: "화이트", name: "", main: "a.jpg", subs: ["a2.jpg"], line: 0 });
  assert.match(t.errors[0], /3번째 줄/);
  const c = parseTable('B1,"블랙, L",b.png,b2.png,b3.png\n');
  assert.equal(c.rows[0].option, "블랙, L"); // 머리줄 없으면 코드,옵션,메인,서브… 순서
  assert.deepEqual(c.rows[0].subs, ["b2.png", "b3.png"]);
});

test("F1 짝짓기: 메인 없음·없는 파일·중복 코드·고아 파일을 실행 전에 표시", () => {
  const rows = parseTable("code,option,main,sub1\nA,,a.jpg,a_s.jpg\nB,,,\nC,,c.jpg,없음.jpg\nA,,a.jpg,\n").rows;
  const { jobs, orphans } = buildJobs(rows, ["a.jpg", "a_s.jpg", "c.jpg", "남는파일.jpg"]);
  assert.deepEqual(jobs.map((j) => j.status), ["invalid", "invalid", "invalid", "invalid"]);
  assert.match(jobs[0].problems.join(), /두 번 이상/);
  assert.match(jobs[1].problems.join(), /메인 사진이 지정되지/);
  assert.match(jobs[2].problems.join(), /없음\.jpg/);
  assert.deepEqual(orphans, ["남는파일.jpg"]);
});

test("F2 파일 순서가 바뀌어도 같은 짝(순서로 짝짓지 않음) + 대소문자 무시", () => {
  const rows = parseTable("code,main,sub\nP1,p1.JPG,p1s.jpg\nP2,p2.jpg,\n").rows;
  const a = buildJobs(rows, ["p1.jpg", "p1s.jpg", "p2.jpg"]).jobs;
  const b = buildJobs(rows, ["p2.jpg", "p1s.jpg", "p1.jpg"]).jobs;
  assert.deepEqual(a.map((j) => j.photos), b.map((j) => j.photos));
  assert.equal(a[0].status, "ready");
  assert.deepEqual(a[0].photos, [{ role: "main", ref: "p1.jpg" }, { role: "sub", ref: "p1s.jpg" }]);
});

test("파일 이름 규칙(코드_main / 코드_sub2)과 공용 서브", () => {
  assert.deepEqual(roleFromFileName("SKU-9_sub2.webp"), { code: "SKU-9", role: "sub", index: 2 });
  assert.equal(roleFromFileName("그냥사진.jpg"), null);
  const rows = rowsFromFileNames(["X_main.jpg", "X_sub1.jpg", "Y_main.png", "로고.png"]);
  assert.deepEqual(rows.map((r) => [r.code, r.main, r.subs]), [["X", "X_main.jpg", ["X_sub1.jpg"]], ["Y", "Y_main.png", []]]);
  const { jobs, orphans } = buildJobs(rows, ["X_main.jpg", "X_sub1.jpg", "Y_main.png", "로고.png"], "로고.png");
  assert.deepEqual(jobs.map((j) => j.photos.map((p) => p.ref)), [["X_main.jpg", "로고.png"], ["Y_main.png", "로고.png"]]);
  assert.deepEqual(orphans, ["X_sub1.jpg"]); // 공용 서브를 쓰면 상품별 서브는 쓰지 않음
  assert.match(buildJobs(rowsFromFileNames(["Z_main.jpg", "Z-main.jpg"]), ["Z_main.jpg", "Z-main.jpg"]).jobs[0].problems.join(), /두 장 이상/);
});

test("F3 파일 이름: 금지 문자 정리·옵션 포함·빈 칸 생략·같은 이름 (2)", () => {
  assert.equal(safePart(' 블랙 / L: "특가" '), "블랙_L_특가");
  const names = compositeNames([{ code: "A1", option: "화이트 Free" }, { code: "B2", option: "" }, { code: "A1", option: "화이트 Free" }], { prefix: "AIM", template: DEFAULT_COMPOSITE.template, ext: "jpg" });
  assert.deepEqual(names, ["AIM_A1_화이트_Free_main.jpg", "AIM_B2_main.jpg", "AIM_A1_화이트_Free_main(2).jpg"]);
  assert.deepEqual(compositeNames([{ code: "C", option: "" }], { prefix: "", template: DEFAULT_COMPOSITE.template, ext: "png" }), ["C_main.png"]);
});

test("F6 결과표: 정해진 칸만(회원 정보 없음)·CSV 따옴표·JSON 형식", () => {
  const rows = [{ code: "A,1", option: "", label: "티셔츠", productId: null, main: "a.jpg", subs: ["s.jpg"], result: "A_main.jpg", status: "done", error: "", returned: "" }];
  const csv = manifestCsv(rows, "c1-x", "2026-11-13T00:00:00Z");
  assert.ok(csv.startsWith("﻿code,option,label,productId,main,subs,result,status,error,returned,settingsVersion,createdAt\r\n"));
  assert.match(csv, /^"A,1",/m);
  const j = JSON.parse(manifestJson(rows, "c1-x", "t"));
  assert.equal(j.kind, "aimaster-product-composite");
  assert.deepEqual(Object.keys(j.items[0]).sort(), ["code", "error", "label", "main", "option", "productId", "result", "returned", "status", "subs"]);
  assert.doesNotMatch(JSON.stringify(j) + csv, /@|api_?key|email/i);
});

test("합성 설정: 범위 맞춤·코드 없는 이름 틀 거절·설정 버전 고정", () => {
  const s = normalizeComposite({ subRatio: 90, subMargin: -5, width: 99999, template: "{prefix}", background: "red" });
  assert.equal(s.subRatio, 50); assert.equal(s.subMargin, 0); assert.equal(s.width, 3000);
  assert.equal(s.template, DEFAULT_COMPOSITE.template); assert.equal(s.background, "#ffffff");
  assert.equal(settingsVersion(DEFAULT_COMPOSITE), settingsVersion(normalizeComposite({})));
  assert.notEqual(settingsVersion(DEFAULT_COMPOSITE), settingsVersion(normalizeComposite({ subRatio: 33 })));
});

test("메인: 안에 맞춤(여백)·꽉 채움(가운데 잘림)·여백 상자", () => {
  const box = { x: 0, y: 0, w: 1000, h: 1000 };
  assert.deepEqual(fitRect(2000, 1000, box, "contain"), { sx: 0, sy: 0, sw: 2000, sh: 1000, dx: 0, dy: 250, dw: 1000, dh: 500 });
  assert.deepEqual(fitRect(2000, 1000, box, "cover"), { sx: 500, sy: 0, sw: 1000, sh: 1000, dx: 0, dy: 0, dw: 1000, dh: 1000 });
  assert.deepEqual(mainBox({ width: 1000, height: 1000, padding: 40 }), { x: 40, y: 40, w: 920, h: 920 });
});

test("서브: 기본 오른쪽 아래 32%·여백 24, 여러 장은 가로/세로로 나란히", () => {
  const base = { width: 1000, height: 1000, subRatio: 32, subMargin: 24 };
  assert.deepEqual(subRects([1], { ...base, subAnchor: "br" }), [{ x: 656, y: 656, w: 320, h: 320 }]);
  const two = subRects([1, 2], { ...base, subAnchor: "bl" });
  assert.deepEqual(two, [{ x: 24, y: 656, w: 320, h: 320 }, { x: 368, y: 816, w: 320, h: 160 }]);
  const col = subRects([1, 1], { ...base, subAnchor: "mr" });
  assert.deepEqual(col.map((r) => [r.x, r.y]), [[656, 168], [656, 512]]);
  assert.deepEqual(subRects([], { ...base, subAnchor: "tl" }), []);
});

// F5 순서 처리·중단·실패만 다시 / P2 주고받기 약속 검사
import { runQueue } from "../src/lib/batch/runQueue.ts";
import { PRODUCT_MSG_JOB, PRODUCT_MSG_RESULT, PRODUCT_MSG_SAVED, PRODUCT_RECEIVER_ORIGIN, PRODUCT_SENDER_ORIGIN, readProductJob, readProductResult, readProductSaved } from "../src/lib/productPhotoHandoff.ts";

test("F5 한 개씩 순서대로·중단하면 남은 것 안 함·실패만 다시", async () => {
  const items = ["a", "b", "c"].map((key) => ({ key, status: "ready" }));
  const ac = new AbortController(); const order = [];
  const r = await runQueue(items, async (it) => { order.push(it.key); if (it.key === "a") ac.abort(); }, { signal: ac.signal, onUpdate: (u) => { items.find((i) => i.key === u.key).status = u.status; } });
  assert.deepEqual(order, ["a"]); assert.equal(r.stopped, true); assert.equal(items[0].status, "done");
  const r2 = await runQueue(items, async (it) => { if (it.key === "b") throw new Error("깨진 사진"); }, { onUpdate: (u) => { items.find((i) => i.key === u.key).status = u.status; } });
  assert.deepEqual([r2.done, r2.failed], [1, 1]); assert.deepEqual(items.map((i) => i.status), ["done", "failed", "done"]);
  const again = [];
  await runQueue(items, async (it) => { again.push(it.key); }, { retryFailed: true });
  assert.deepEqual(again, ["b"]); // 성공분은 다시 안 함
});

const ID = "11111111-1111-4111-8111-111111111111", ID2 = "22222222-2222-4222-8222-222222222222", JOB = "33333333-3333-4333-8333-333333333333";
const img = (type = "image/jpeg", n = 10) => new Blob([new Uint8Array(n)], { type });
const job = (products) => ({ type: PRODUCT_MSG_JOB, jobId: JOB, products });
const prod = (o = {}) => ({ productId: ID, label: "티셔츠", baseRevision: "2026-11-13T00:00:00Z", photos: [{ role: "main", ref: "a", file: img() }, { role: "sub", ref: "b", file: img("image/png") }], ...o });

test("P2 작업 받기: 보낸 곳 주소·형식·메인 1장 맨 앞·중복·개수 검사", () => {
  assert.equal(readProductJob("https://evil.example", job([prod()])), null);
  assert.equal(readProductJob(PRODUCT_SENDER_ORIGIN, { type: "other" }), null);
  const ok = readProductJob(PRODUCT_SENDER_ORIGIN, job([prod(), prod({ productId: ID2 })]));
  assert.equal(ok.products.length, 2); assert.equal(ok.products[0].photos[0].role, "main");
  assert.match(readProductJob(PRODUCT_SENDER_ORIGIN, job([prod(), prod()])).error, /두 번/);
  assert.match(readProductJob(PRODUCT_SENDER_ORIGIN, job([prod({ photos: [{ role: "sub", ref: "", file: img() }, { role: "main", ref: "", file: img() }] })])).error, /맨 앞/);
  assert.match(readProductJob(PRODUCT_SENDER_ORIGIN, job([prod({ photos: [{ role: "main", ref: "", file: img("image/gif") }] })])).error, /PNG/);
  assert.match(readProductJob(PRODUCT_SENDER_ORIGIN, job([prod({ productId: "x" })])).error, /상품 번호/);
  assert.match(readProductJob(PRODUCT_SENDER_ORIGIN, job([prod({ baseRevision: "" })])).error, /수정 시각/);
  assert.match(readProductJob(PRODUCT_SENDER_ORIGIN, { ...job([prod()]), jobId: "1" }).error, /작업 번호/);
});

test("P2 결과·저장 알림: 바나나 주소·같은 작업·보낸 상품만·10MB", () => {
  const ids = new Set([ID]);
  const res = (o = {}) => ({ type: PRODUCT_MSG_RESULT, jobId: JOB, productId: ID, file: img(), settingsVersion: "c1-x", ...o });
  assert.equal(readProductResult(PRODUCT_SENDER_ORIGIN, res(), JOB, ids), null);
  assert.equal(readProductResult(PRODUCT_RECEIVER_ORIGIN, res({ jobId: ID2 }), JOB, ids), null);
  assert.equal(readProductResult(PRODUCT_RECEIVER_ORIGIN, res(), JOB, ids).productId, ID);
  assert.match(readProductResult(PRODUCT_RECEIVER_ORIGIN, res({ productId: ID2 }), JOB, ids).error, /보낸 상품이 아닙니다/);
  assert.match(readProductResult(PRODUCT_RECEIVER_ORIGIN, res({ file: img("image/webp") }), JOB, ids).error, /PNG·JPG/);
  assert.deepEqual(readProductSaved(PRODUCT_SENDER_ORIGIN, { type: PRODUCT_MSG_SAVED, jobId: JOB, productId: ID, ok: false, error: "바뀜" }, JOB), { productId: ID, ok: false, error: "바뀜" });
  assert.equal(readProductSaved(PRODUCT_RECEIVER_ORIGIN, { type: PRODUCT_MSG_SAVED, jobId: JOB, productId: ID, ok: true }, JOB), null);
});

test("서브 정사각 채우기(기본): 긴 사진도 정사각 상자, 원본 비율은 선택", () => {
  const base = { width: 1000, height: 1000, subRatio: 32, subMargin: 24, subAnchor: "br" };
  assert.equal(normalizeComposite({}).subFit, "cover");
  assert.equal(normalizeComposite({ subFit: "contain" }).subFit, "contain");
  assert.deepEqual(subRects([0.1], { ...base, subFit: "cover" }), [{ x: 656, y: 656, w: 320, h: 320 }]);
  assert.deepEqual(subRects([0.1], { ...base, subFit: "contain" }).map((r) => [r.w, r.h]), [[32, 320]]); // 예전 동작(가는 띠)
  assert.deepEqual(fitRect(100, 1000, { x: 0, y: 0, w: 320, h: 320 }, "cover"), { sx: 0, sy: 450, sw: 100, sh: 100, dx: 0, dy: 0, dw: 320, dh: 320 });
});
