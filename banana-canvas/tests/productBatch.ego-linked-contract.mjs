// ECOM-17 고정 조건(ego lite에서 실행) — 결과 번호(resultId) 약속: 정확한 응답만 반영, 늦은 옛 성공 무시, 실패는 그 결과만, 중복 무시,
// 옛 방식 응답(resultId 없음)은 「확인 필요」·자동 재전송 없음·반영하기에서 확인 창으로만 다시 보냄.
// 부모 창 postMessage를 가로채 보낸 결과(상품·resultId)만 기록한다(실제 상세·쇼핑몰 송수신·저장·AI·DB 0).
// 실행: node tests/productBatch.browser.mjs --minutes 15 → ego-browser nodejs -e "globalThis.__PB_ORIGIN='http://127.0.0.1:PORT/'; globalThis.__PB_LABEL='contract'; await import('file:///<저장소>/banana-canvas/tests/productBatch.ego-linked-contract.mjs')"
const { writeFile } = await import("node:fs/promises");
const HERE = new URL(".", import.meta.url);
const OUT = decodeURIComponent(new URL("../test-artifacts", HERE).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const ORIGIN = globalThis.__PB_ORIGIN;
const LABEL = globalThis.__PB_LABEL || "contract";
const task = await taskSpace("바나나 저장 약속 ECOM-17 " + LABEL);
const page = task.page("p1");
await page.goto(ORIGIN);
await page.waitForFunction(() => document.querySelectorAll("input[type=file]").length >= 2, null, { timeout: 15000 });
await page.evaluate(() => {
  window.__sends = [];
  window.postMessage = (m) => { if (m && m.type === "aimaster-product-photos-result") window.__sends.push({ p: String(m.productId).slice(0, 1), id: m.resultId || null }); };
});
const popupPromise = page.waitForEvent("popup");
await page.cdp("Runtime.evaluate", { expression: `window.__w = window.open(location.origin + "/?from=shop-detail", "pbc" + Date.now(), "width=420,height=900"); !!window.__w`, userGesture: true });
const popupPage = await popupPromise;
await popupPage.waitForLoadState();
await page.evaluate(() => { window.__pbC = null; (async () => {
  const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
  const w = window.__w;
  for (let i = 0; i < 60 && !(w.document && w.document.querySelectorAll("input[type=file]").length >= 2); i++) await sleep(250);
  await sleep(800);
  const txt = () => w.document.body.textContent;
  const btn = (re) => [...w.document.querySelectorAll("#root button")].find((b) => new RegExp(re).test(b.textContent.trim()));
  const marks = () => ({ saved: (txt().match(/반환 완료 ✓/g) || []).length, sending: (txt().match(/전송 중\.\.\./g) || []).length, failed: (txt().match(/반환 실패/g) || []).length, unsure: (txt().match(/확인 필요/g) || []).length });
  const sentSince = (n) => window.__sends.slice(n);
  const blob = (rgb, size) => new Promise((res) => {
    const c = w.document.createElement("canvas"); c.width = size; c.height = size;
    const g = c.getContext("2d"); g.fillStyle = `rgb(${rgb})`; g.fillRect(0, 0, size, size);
    c.toBlob(async (b) => res(new w.Blob([await b.arrayBuffer()], { type: "image/png" })), "image/png");
  });
  const SENDER = "https://shop-detail-page.buylife.xyz";
  const send = (data) => w.dispatchEvent(new w.MessageEvent("message", { data, origin: SENDER, source: window }));
  const A = "aaaaaaaa-1111-4111-8111-111111111111", B = "bbbbbbbb-2222-4222-8222-222222222222";
  const J1 = "11111111-3333-4333-8333-333333333333", J2 = "22222222-3333-4333-8333-333333333333", J3 = "33333333-3333-4333-8333-333333333333";
  const product = async (id, label, rgb) => ({ productId: id, label, baseRevision: "2026-11-17T00:00:00Z", photos: [
    { role: "main", ref: `p/${label}_main.png`, file: await blob(rgb, 500) },
    { role: "sub", ref: `p/${label}_sub.png`, file: await blob("0,200,0", 160) },
  ] });
  const ack = (job, productId, ok, resultId, extra = {}) => send({ type: "aimaster-product-photos-saved", jobId: job, productId, ok, ...(resultId ? { resultId } : {}), ...extra });
  const run = async () => {
    btn("합성 규칙 & 미리보기$")?.click(); await sleep(700);
    btn("상품 일괄 합성 시작")?.click();
    for (let i = 0; i < 20 && w.document.querySelector(".pb-g3"); i++) await sleep(150);
    for (let i = 0; i < 120 && !w.document.querySelector(".pb-g3"); i++) await sleep(250);
    await sleep(500);
  };
  const setting = async (label) => { btn("합성 규칙 & 미리보기$")?.click(); await sleep(600); [...w.document.querySelectorAll("button[aria-pressed]")].find((x) => x.textContent.startsWith(label))?.click(); await sleep(500); };
  const out = {};
  // 1) 정확한 응답 → 같은 설정 재합성은 저장된 A를 다시 보내지 않음
  send({ type: "aimaster-product-photos", jobId: J1, products: [await product(A, "상품A", "220,60,60"), await product(B, "상품B", "60,60,220")] });
  await sleep(1500);
  let n = window.__sends.length; await run();
  const s1 = sentSince(n);
  out.run1 = { sent: s1.map((x) => x.p).join(""), allHaveId: s1.every((x) => x.id), ...marks() };
  ack(J1, A, true, s1.find((x) => x.p === "a").id); await sleep(500);
  out.ackA = marks();
  n = window.__sends.length; await run();
  out.rerunSame = { sent: sentSince(n).map((x) => x.p).join(""), ...marks() };
  // 2) MOV-11 ①: V1 보냄 → 설정 변경 V2 보냄 → 늦은 V1 성공 → V2 실패 → 재합성 시 V2 다시 보냄
  send({ type: "aimaster-product-photos", jobId: J2, products: [await product(A, "상품A", "220,60,60")] });
  await sleep(1500);
  n = window.__sends.length; await run(); const v1 = sentSince(n)[0];
  await setting("1200");
  n = window.__sends.length; await run(); const v2 = sentSince(n)[0];
  ack(J2, A, true, v1.id); await sleep(500);
  out.lateV1Ok = marks(); // V2 줄은 저장됨이 되면 안 됨
  ack(J2, A, false, v2.id, { error: "시험 실패" }); await sleep(500);
  out.v2Fail = marks();
  ack(J2, A, false, v2.id, { error: "중복" }); ack(J2, A, true, v2.id); await sleep(500);
  out.dupAfterFail = marks(); // 이미 처리된 번호의 중복 응답 무시
  n = window.__sends.length; await run();
  out.rerunAfterV2Fail = { sent: sentSince(n).map((x) => x.p).join(""), ...marks() };
  // 3) 옛 방식 응답(resultId 없음) → 확인 필요·자동 재전송 없음·반영하기는 확인 창 거절 시 안 보냄, 승인 시 보냄
  send({ type: "aimaster-product-photos", jobId: J3, products: [await product(A, "상품A", "220,60,60")] });
  await sleep(1500);
  await run();
  ack(J3, A, true, null); await sleep(500);
  out.legacyAck = marks();
  n = window.__sends.length; await run();
  out.rerunLegacy = { sent: sentSince(n).map((x) => x.p).join(""), ...marks() };
  w.confirm = () => false;
  n = window.__sends.length; btn("상품에 반영하기")?.click(); await sleep(600);
  out.reflectDeclined = { sent: sentSince(n).map((x) => x.p).join(""), ...marks() };
  w.confirm = () => true;
  n = window.__sends.length; btn("상품에 반영하기")?.click(); await sleep(600);
  out.reflectConfirmed = { sent: sentSince(n).map((x) => x.p).join(""), ...marks() };
  // 4) 다른 주소·다른 작업의 응답은 무시
  const before = marks();
  w.dispatchEvent(new w.MessageEvent("message", { data: { type: "aimaster-product-photos-saved", jobId: J3, productId: A, ok: true }, origin: "https://evil.example", source: window }));
  ack(J1, A, true, null); await sleep(500);
  out.foreignIgnored = JSON.stringify(marks()) === JSON.stringify(before);
  const d = w.document.documentElement; out.overflow = d.scrollWidth > d.clientWidth ? `${d.scrollWidth}>${d.clientWidth}` : "0";
  w.close();
  return out;
})().then((v) => { window.__pbC = v; }, (e) => { window.__pbC = { error: String(e) }; }); return true; });
await page.waitForFunction(() => window.__pbC, null, { timeout: 300000 });
const r = await page.evaluate(() => window.__pbC);
console.log(JSON.stringify(r));
await writeFile(`${OUT}/pb-ego-${LABEL}.json`, JSON.stringify(r, null, 1));
await task.finish({ keep: [] });
