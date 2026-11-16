// ECOM-12 모의 연결 검사(ego lite에서 실행) — F-09(`80786070b`) 연결 모드 상품 목록 유지·2단계 첫 미리보기·완료 응답 saved 보존.
// 실제 상세페이지·쇼핑몰과 주고받지 않는다: 같은 하네스 주소의 부모 창이 ?from=shop-detail 자식 창을 열고, 자식 창에
// 「상세페이지 주소에서 온」 모의 MessageEvent를 직접 넣는다. 자식이 부모로 보내는 READY·결과 메시지는 대상 주소가 달라 브라우저가 버린다.
// 실행: node tests/productBatch.browser.mjs --minutes 15 → ORIGIN을 넣어
//   ego-browser nodejs -e "globalThis.__PB_ORIGIN='http://127.0.0.1:PORT/'; globalThis.__PB_LABEL='linked'; await import('file:///<저장소>/banana-canvas/tests/productBatch.ego-linked.mjs')"
// 결과: test-artifacts/pb-ego-<LABEL>.json(git 제외). 한계: 실제 상세페이지·쇼핑몰 화면과 운영 저장은 검사하지 않는다.
const { writeFile } = await import("node:fs/promises");
const HERE = new URL(".", import.meta.url);
const OUT = decodeURIComponent(new URL("../test-artifacts", HERE).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const ORIGIN = globalThis.__PB_ORIGIN;
const LABEL = globalThis.__PB_LABEL || "linked";
const task = await taskSpace("바나나 연결 모드 모의 ECOM-12 " + LABEL);
const page = task.page("p1");
await page.goto(ORIGIN);
await page.waitForFunction(() => document.querySelectorAll("input[type=file]").length >= 2, null, { timeout: 15000 });

// 사용자 동작으로 간주되는 평가로 자식 창 열기(팝업 차단 회피). ego는 새 창을 미리 기다려 받아야 멈추지 않는다.
const popupPromise = page.waitForEvent("popup");
await page.cdp("Runtime.evaluate", { expression: `window.__w = window.open(location.origin + "/?from=shop-detail", "pbchild" + Date.now(), "width=420,height=900"); !!window.__w`, userGesture: true });
const popupPage = await popupPromise;
await popupPage.waitForLoadState();
// ego의 page.evaluate는 15초 제한이 있어, 검사는 페이지 안에서 백그라운드로 돌리고 결과(window.__pbLinked)를 따로 읽는다.
await page.evaluate(() => { window.__pbLinked = null; (async () => {
  const sleep = (ms) => new Promise((x) => setTimeout(x, ms));
  const w = window.__w;
  if (!w) return { error: "자식 창이 열리지 않음" };
  for (let i = 0; i < 60 && !(w.document && w.document.querySelectorAll("input[type=file]").length >= 2); i++) await sleep(250);
  await sleep(800);
  const out = { childOpened: true, opener: w.opener === window };
  const txt = () => w.document.body.textContent;
  const btn = (re) => [...w.document.querySelectorAll("#root button")].find((b) => new RegExp(re).test(b.textContent.trim()));
  const canvasColor = () => {
    const c = w.document.querySelector(".pb-split canvas");
    if (!c || !c.width) return "없음";
    const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let green = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 150 && d[i] < 50 && d[i + 2] < 50) green++;
    return green > 0 ? "서브 보임" : "그림";
  };
  const blob = (rgb, size) => new Promise((res) => {
    const c = w.document.createElement("canvas"); c.width = size; c.height = size;
    const g = c.getContext("2d"); g.fillStyle = `rgb(${rgb})`; g.fillRect(0, 0, size, size);
    c.toBlob(async (b) => res(new w.Blob([await b.arrayBuffer()], { type: "image/png" })), "image/png"); // 자식 창 쪽 Blob이어야 instanceof 검사 통과
  });
  const id1 = "11111111-1111-4111-8111-111111111111", id2 = "22222222-2222-4222-8222-222222222222";
  const job = "33333333-3333-4333-8333-333333333333";
  const products = [];
  for (const [id, label, rgb] of [[id1, "상품A", "220,60,60"], [id2, "상품B", "60,60,220"]]) {
    products.push({ productId: id, label, baseRevision: "2026-11-16T00:00:00Z", photos: [
      { role: "main", ref: `p/${label}_main.png`, file: await blob(rgb, 800) },
      { role: "sub", ref: `p/${label}_sub.png`, file: await blob("0,200,0", 300) },
    ] });
  }
  const SENDER = "https://shop-detail-page.buylife.xyz";
  const send = (data) => w.dispatchEvent(new w.MessageEvent("message", { data, origin: SENDER, source: window }));
  // 잘못된 주소에서 온 메시지는 무시돼야 함
  w.dispatchEvent(new w.MessageEvent("message", { data: { type: "aimaster-product-photos", jobId: job, products }, origin: "https://evil.example", source: window }));
  await sleep(600);
  out.wrongOriginIgnored = !/상품 \d+개를 받았습니다/.test(txt());
  send({ type: "aimaster-product-photos", jobId: job, products });
  await sleep(1800);
  out.received = (txt().match(/상품 (\d+)개를 받았습니다/) || [])[1] ?? null;
  out.noticeAfterSend = (txt().match(/받은 자료에 문제가 있습니다: [^.]{0,60}/) || [""])[0];
  out.step2 = !!w.document.querySelector(".pb-split");
  out.firstPreview = canvasColor();
  // 재계산 유발: 단계 표시줄 1단계 → 옵션 B → 옵션 A → 2단계 (F-09: 이때 목록이 지워지면 안 됨)
  btn("자료 입력")?.click(); await sleep(800);
  const radios = w.document.querySelectorAll('input[name="subMode"]');
  radios[1]?.click(); await sleep(600); radios[0]?.click(); await sleep(600);
  out.step1Text = (txt().match(/작업 행 \d+건|합성 가능:\s*\d+건/g) || []).slice(0, 2);
  btn("합성 규칙 & 미리보기$")?.click(); await sleep(1500);
  out.afterRematchPreview = canvasColor();
  out.afterRematchCount = (txt().match(/\d+ \/ (\d+)/) || [])[1] ?? null;
  // 일괄 합성 → 4단계
  btn("상품 일괄 합성 시작")?.click();
  for (let i = 0; i < 120 && !w.document.querySelector(".pb-g3"); i++) await sleep(500);
  out.done = (txt().match(/총 \d+개 상품 중\s*\d+개 성공/) || [""])[0];
  // 반환(모의): 부모 주소가 달라 실제 전달되지 않음 → 상품A만 「저장됨」 응답 주입
  const ret = btn("상품에 반영하기");
  out.returnButton = ret ? ret.textContent.trim().slice(0, 30) : null;
  ret?.click(); await sleep(1200);
  send({ type: "aimaster-product-photos-saved", jobId: job, productId: id1, ok: true });
  await sleep(800);
  out.savedMarks = (txt().match(/반환 완료 ✓/g) || []).length;
  // ECOM-17 뒤: 여기 넣는 저장 응답은 resultId 없는 옛 방식이라 「반환 완료」가 아니라 「확인 필요」가 정상
  out.unsureMarks = (txt().match(/확인 필요/g) || []).length;
  // 다른 작업 번호의 saved는 무시
  send({ type: "aimaster-product-photos-saved", jobId: "44444444-4444-4444-8444-444444444444", productId: id2, ok: true });
  await sleep(600);
  out.foreignSavedIgnored = (txt().match(/반환 완료 ✓/g) || []).length === out.savedMarks;
  // 다시 합성해도 이미 저장된 상품의 saved가 남는지
  btn("합성 규칙 & 미리보기$")?.click(); await sleep(1000);
  btn("상품 일괄 합성 시작")?.click();
  for (let i = 0; i < 120 && !/총 \d+개 상품 중/.test(txt()); i++) await sleep(500);
  await sleep(1500);
  out.rerunDone = (txt().match(/총 \d+개 상품 중\s*\d+개 성공/) || [""])[0];
  out.savedAfterRerun = (txt().match(/반환 완료 ✓/g) || []).length;
  const d = w.document.documentElement; out.overflow = d.scrollWidth > d.clientWidth ? `${d.scrollWidth}>${d.clientWidth}` : "0";
  w.close();
  return out;
})().then((v) => { window.__pbLinked = v; }, (e) => { window.__pbLinked = { error: String(e) }; }); return true; });
await page.waitForFunction(() => window.__pbLinked, null, { timeout: 240000 });
const r = await page.evaluate(() => window.__pbLinked);
console.log(JSON.stringify(r));
await writeFile(`${OUT}/pb-ego-${LABEL}.json`, JSON.stringify(r, null, 1));
await task.finish({ keep: [] });
