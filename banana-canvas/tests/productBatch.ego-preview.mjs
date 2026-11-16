// ECOM-11 고정 조건(ego lite에서 실행): 설정 조작 없이 1→2단계 첫 미리보기, 단계 왕복·교체·설정 변경·단계 표시줄·1→4 전체 흐름·처음으로·중단·같은 이름·개별 모드·25MB.
// 실행: node tests/productBatch.browser.mjs --minutes 30 → 출력 ORIGIN을 넣어
//   ego-browser nodejs -e "globalThis.__PB_ORIGIN='http://127.0.0.1:PORT/'; globalThis.__PB_LABEL='check'; await import('file:///<저장소>/banana-canvas/tests/productBatch.ego-preview.mjs')"
// 결과는 test-artifacts/pb-ego-<LABEL>.json(git 제외). 수정 전: 진입 직후 미리보기 「없음」, 수정 후: 빨강/초록 등.
const { readFile, writeFile } = await import("node:fs/promises");
const HERE = new URL(".", import.meta.url);
const OUT = decodeURIComponent(new URL("../test-artifacts", HERE).pathname).replace(/^\/([A-Za-z]:)/, "$1");
const FX = OUT + "/pb-fixtures";
const ORIGIN = globalThis.__PB_ORIGIN;
const LABEL = globalThis.__PB_LABEL;
const task = await taskSpace("바나나 미리보기 ECOM-11 " + LABEL);
const page = task.page("p1");
console.log({ taskSpaceId: task.spaceId, ORIGIN, LABEL });

const sleep = (ms) => page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);
const go = (re) => page.evaluate(async (re) => { const b = [...document.querySelectorAll("#root button")].find((x) => new RegExp(re).test(x.textContent.trim())); b?.click(); await new Promise((r) => setTimeout(r, 1500)); return !!b; }, re);
const ov = () => page.evaluate(() => { const d = document.documentElement; return d.scrollWidth > d.clientWidth ? `${d.scrollWidth}>${d.clientWidth}` : "0"; });
const ready = () => page.evaluate(() => { const m = document.body.textContent.match(/합성 가능:\s*(\d+)건/); return m ? Number(m[1]) : null; });
const canvas = () => page.evaluate(() => {
  const c = document.querySelector(".pb-split canvas");
  if (!c || !c.width) return "없음";
  const d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
  let red = 0, green = 0, blue = 0;
  for (let i = 0; i < d.length; i += 4) {
    const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
    if (r > 200 && g < 50 && b < 50) red++; else if (g > 150 && r < 50 && b < 50) green++; else if (b > 200 && r < 50 && g < 50) blue++;
  }
  return red > 0 ? "빨강" : green > 0 ? "초록" : blue > 0 ? "파랑" : "그림";
});
const errs = () => page.evaluate(() => (window.__pbErrs || []).slice(0, 5));
const tag = () => page.evaluate(() => {
  const ins = [...document.querySelectorAll("input[type=file]")];
  ins[0]?.setAttribute("data-pb-test", "direct");
  ins.find((i) => i.closest("label")?.textContent.includes("공용 서브"))?.setAttribute("data-pb-test", "common");
});
async function fresh(W) {
  await page.cdp("Emulation.setDeviceMetricsOverride", { width: W, height: 812, deviceScaleFactor: 2, mobile: true });
  await page.goto(ORIGIN);
  await page.waitForFunction(() => document.querySelectorAll("input[type=file]").length >= 2, null, { timeout: 15000 });
  await page.evaluate(() => {
    try { localStorage.clear(); } catch {}
    window.__pbErrs = [];
    addEventListener("error", (e) => window.__pbErrs.push("error:" + e.message));
    addEventListener("unhandledrejection", (e) => window.__pbErrs.push("reject:" + String(e.reason)));
    const ce = console.error.bind(console); console.error = (...a) => { window.__pbErrs.push("console:" + a.map(String).join(" ").slice(0, 120)); ce(...a); };
  });
  await tag();
}
const common = async (f) => { await tag(); await page.setInputFiles('[data-pb-test="common"]', [f]); await sleep(700); };
const direct = async (names) => { await tag(); await page.setInputFiles('[data-pb-test="direct"]', names.map((n) => FX + "/" + n)); await sleep(1000); };
const enter2 = async () => { await go("^다음: 2단계"); return canvas(); };

const summary = {};
for (const W of [375, 320]) {
  const r = {};
  // 1. 고정 조건: 공용(빨강)+메인 2장 → 설정 조작 없이 2단계 진입 직후 첫 미리보기
  await fresh(W);
  await common(FX + "/same/Z_badge.png");
  await direct(["A001_main.png", "A002_main.png"]);
  r.ready = await ready();
  r.entry = await enter2();
  await page.screenshot({ path: `${OUT}/pb-ego-${LABEL}-entry-${W}.png` });
  if (W === 375) {
    // 2. 2→1(이전 단추)→ 공용 교체(초록) → 2
    await go("^← 이전: 1단계");
    await common(FX + "/Y_badge.png");
    r.backReplaceEntry = await enter2();
    // 3. 설정 변경
    await page.evaluate(() => [...document.querySelectorAll("button[aria-pressed]")].find((x) => x.textContent.startsWith("1200"))?.click());
    await sleep(1200);
    r.afterSetting = await canvas();
    // 4. 단계 표시줄로 1 → 2
    await go("자료 입력");
    await go("합성 규칙 & 미리보기$");
    r.stepperEntry = await canvas();
    // 5. 일괄 실행 → 4단계 → 처음으로 → 다시 2단계
    await go("상품 일괄 합성 시작");
    await page.waitForFunction(() => document.querySelector(".pb-g3"), null, { timeout: 60000 }).catch(() => {});
    r.done = await page.evaluate(() => (document.body.textContent.match(/총 \d+개 상품 중\s*\d+개 성공/) || [""])[0]);
    r.step4Buttons = await page.evaluate(() => [...document.querySelectorAll("#root button")].map((b) => b.textContent.trim()).filter((t) => /ZIP|CSV|반환|재시도|새 상품 묶음/.test(t)).map((t) => t.slice(0, 24)));
    r.step4ov = await ov();
    await go("새 상품 묶음 일괄 합성 시작하기");
    r.afterResetReady = await ready();
    r.afterResetEntry = await enter2();
    r.errsFlow = await errs();

    // 6. 중단(정리) 뒤 2단계로 돌아와 미리보기
    await fresh(W);
    await common(FX + "/same/Z_badge.png");
    await direct(["A001_main.png", "A002_main.png"]);
    await go("^다음: 2단계");
    await page.evaluate(() => { [...document.querySelectorAll("#root button")].find((x) => /상품 일괄 합성 시작/.test(x.textContent))?.click(); });
    await page.evaluate(() => { [...document.querySelectorAll("#root button")].find((x) => /전체 일괄 즉시 중단/.test(x.textContent))?.click(); });
    await sleep(1500);
    r.cancelNotice = await page.evaluate(() => /즉시 중단했습니다/.test(document.body.textContent) ? "중단 안내" : (document.querySelector(".pb-g3") ? "이미 완료" : "안내 없음"));
    await go("합성 규칙 & 미리보기$");
    r.afterCancelEntry = await canvas();
    r.errsCancel = await errs();

    // 7. 같은 이름(직접 파랑 + 공용 빨강) 진입 직후
    await fresh(W);
    await direct(["A001_main.png", "A002_main.png", "Z_badge.png"]);
    await common(FX + "/same/Z_badge.png");
    r.sameNameEntry = await enter2();

    // 8. 개별 모드(옵션 B) 진입 직후
    await fresh(W);
    await direct(["A001_main.png", "A001_sub1.png", "A002_main.png", "A002_sub1.png"]);
    await page.evaluate(() => document.querySelectorAll('input[name="subMode"]')[1]?.click());
    await sleep(600);
    r.individualReady = await ready();
    r.individualEntry = await enter2();
  } else {
    await go("상품 일괄 합성 시작");
    await page.waitForFunction(() => document.querySelector(".pb-g3"), null, { timeout: 60000 }).catch(() => {});
    r.done = await page.evaluate(() => (document.body.textContent.match(/총 \d+개 상품 중\s*\d+개 성공/) || [""])[0]);
    r.step4ov = await ov();
  }
  // 9. 25MB 경계 유지
  await fresh(W);
  await common(FX + "/C26_common_sub.png");
  r.guardCommon = await page.evaluate(() => document.body.textContent.includes("25MB를 넘는 사진은 공용 서브로 쓸 수 없습니다"));
  await direct(["B26_main.png"]);
  r.guardDirect = await page.evaluate(() => document.body.textContent.includes("25MB를 넘는 사진 1개는 넣지 않았습니다"));
  r.ov1 = await ov();
  summary[W] = r;
}
console.log(JSON.stringify(summary));
await writeFile(`${OUT}/pb-ego-${LABEL}.json`, JSON.stringify(summary, null, 1));
await task.finish({ keep: [] });
