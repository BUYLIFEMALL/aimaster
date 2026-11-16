// ECOM-15 고정 조건(ego lite에서 실행) — 연결 모드에서 다시 합성·다시 반영할 때 「저장됨」 보존과 중복 전송 막기.
// 같은 하네스 주소의 부모 창이 ?from=shop-detail 자식 창을 열고 상세페이지 주소의 모의 메시지를 넣는다. 자식이 부모로 보내는
// 결과 메시지는 부모 창의 postMessage를 바꿔 끼워 횟수만 센다(실제 상세·쇼핑몰 송수신·상품 저장·AI·DB 0).
// 실행: node tests/productBatch.browser.mjs --minutes 15 → ORIGIN을 넣어
//   ego-browser nodejs -e "globalThis.__PB_ORIGIN='http://127.0.0.1:PORT/'; globalThis.__PB_LABEL='saved'; await import('file:///<저장소>/banana-canvas/tests/productBatch.ego-linked-saved.mjs')"
const { writeFile } = await import("node:fs/promises");
const HERE = new URL(".", import.meta.url);
const OUT = decodeURIComponent(new URL("../test-artifacts", HERE).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const ORIGIN = globalThis.__PB_ORIGIN;
const LABEL = globalThis.__PB_LABEL || "saved";
const task = await taskSpace("바나나 저장됨 보존 ECOM-15 " + LABEL);
const page = task.page("p1");
await page.goto(ORIGIN);
await page.waitForFunction(() => document.querySelectorAll("input[type=file]").length >= 2, null, { timeout: 15000 });
await page.evaluate(() => {
  window.__sends = [];
  // 자식 창의 window.opener.postMessage(결과)를 가로채 횟수만 센다 — 실제로 어디에도 보내지 않음
  window.postMessage = (m) => { if (m && m.type === "aimaster-product-photos-result") window.__sends.push(String(m.productId).slice(0, 1)); };
});
const popupPromise = page.waitForEvent("popup");
await page.cdp("Runtime.evaluate", { expression: `window.__w = window.open(location.origin + "/?from=shop-detail", "pbsaved" + Date.now(), "width=420,height=900"); !!window.__w`, userGesture: true });
const popupPage = await popupPromise;
await popupPage.waitForLoadState();
// page.evaluate 15초 제한 때문에 페이지 안 백그라운드로 돌리고 결과만 읽는다
await page.evaluate(() => { window.__pbSaved = null; (async () => {
  const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
  const w = window.__w;
  for (let i = 0; i < 60 && !(w.document && w.document.querySelectorAll("input[type=file]").length >= 2); i++) await sleep(250);
  await sleep(800);
  const txt = () => w.document.body.textContent;
  const btn = (re) => [...w.document.querySelectorAll("#root button")].find((b) => new RegExp(re).test(b.textContent.trim()));
  const marks = () => ({ saved: (txt().match(/반환 완료 ✓/g) || []).length, sending: (txt().match(/전송 중\.\.\./g) || []).length, failed: (txt().match(/반환 실패/g) || []).length });
  const sentSince = (n) => window.__sends.slice(n).join("");
  const blob = (rgb, size) => new Promise((res) => {
    const c = w.document.createElement("canvas"); c.width = size; c.height = size;
    const g = c.getContext("2d"); g.fillStyle = `rgb(${rgb})`; g.fillRect(0, 0, size, size);
    c.toBlob(async (b) => res(new w.Blob([await b.arrayBuffer()], { type: "image/png" })), "image/png");
  });
  const SENDER = "https://shop-detail-page.buylife.xyz";
  const send = (data) => w.dispatchEvent(new w.MessageEvent("message", { data, origin: SENDER, source: window }));
  const A = "aaaaaaaa-1111-4111-8111-111111111111", B = "bbbbbbbb-2222-4222-8222-222222222222";
  const job1 = "11111111-3333-4333-8333-333333333333", job2 = "22222222-3333-4333-8333-333333333333";
  const product = async (id, label, rgb) => ({ productId: id, label, baseRevision: "2026-11-16T00:00:00Z", photos: [
    { role: "main", ref: `p/${label}_main.png`, file: await blob(rgb, 600) },
    { role: "sub", ref: `p/${label}_sub.png`, file: await blob("0,200,0", 200) },
  ] });
  const run = async () => {
    btn("합성 규칙 & 미리보기$")?.click(); await sleep(800);
    btn("상품 일괄 합성 시작")?.click();
    for (let i = 0; i < 20 && w.document.querySelector(".pb-g3"); i++) await sleep(150);
    for (let i = 0; i < 120 && !w.document.querySelector(".pb-g3"); i++) await sleep(250);
    await sleep(600);
  };
  const out = {};
  send({ type: "aimaster-product-photos", jobId: job1, products: [await product(A, "상품A", "220,60,60"), await product(B, "상품B", "60,60,220")] });
  await sleep(1500);
  let n = window.__sends.length;
  await run();
  out.run1 = { sent: sentSince(n), ...marks() };
  send({ type: "aimaster-product-photos-saved", jobId: job1, productId: A, ok: true }); await sleep(600);
  out.ackA = marks();
  n = window.__sends.length;
  await run(); // 같은 설정 다시 합성
  out.rerunSame = { sent: sentSince(n), ...marks() };
  n = window.__sends.length;
  btn("상품에 반영하기")?.click(); await sleep(800);
  out.reflectClick = { sent: sentSince(n), ...marks() };
  // 설정을 바꿔 다시 합성 → 새 결과라 다시 보내고 「저장됨」은 붙지 않아야 함
  btn("합성 규칙 & 미리보기$")?.click(); await sleep(800);
  [...w.document.querySelectorAll("button[aria-pressed]")].find((x) => x.textContent.startsWith("1200"))?.click(); await sleep(600);
  n = window.__sends.length;
  await run();
  out.rerunChanged = { sent: sentSince(n), ...marks() };
  send({ type: "aimaster-product-photos-saved", jobId: job1, productId: A, ok: true }); await sleep(500);
  send({ type: "aimaster-product-photos-saved", jobId: job1, productId: B, ok: false, error: "시험 실패" }); await sleep(600);
  out.acksAfterChange = marks();
  // 다른 작업(같은 상품 번호 A)이 새로 오면 이전 「저장됨」이 섞이면 안 됨
  send({ type: "aimaster-product-photos", jobId: job2, products: [await product(A, "상품A", "220,60,60")] });
  await sleep(1500);
  n = window.__sends.length;
  await run();
  out.newJob = { sent: sentSince(n), ...marks() };
  const d = w.document.documentElement; out.overflow = d.scrollWidth > d.clientWidth ? `${d.scrollWidth}>${d.clientWidth}` : "0";
  w.close();
  return out;
})().then((v) => { window.__pbSaved = v; }, (e) => { window.__pbSaved = { error: String(e) }; }); return true; });
await page.waitForFunction(() => window.__pbSaved, null, { timeout: 240000 });
const r = await page.evaluate(() => window.__pbSaved);
console.log(JSON.stringify(r));
await writeFile(`${OUT}/pb-ego-${LABEL}.json`, JSON.stringify(r, null, 1));
await task.finish({ keep: [] });
