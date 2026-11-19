import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// FRONT-20261119-QUICKBAR — 주인님 휴대폰 실기기에서 오른쪽 빠른 메뉴가 처음부터 펼쳐져 상품 카드를 가림.
// 767px 이하는 처음에 손잡이만(본문 오른쪽 여백 안), 768px 이상은 기존처럼 펼친 패널 — CSS(md)로 서버 첫 화면부터 결정, 누른 뒤에는 누른 상태.
// 보완(Mac QA P2·P3): 손잡이가 상품 링크·배지를 덮지 않게 여백 안으로, 첫 화면부터 이름·aria-expanded가 보이는 모양과 일치.
// 실제 컴포넌트를 happy-dom에 그려 확인한다(네트워크·DB 0). 폭별 실제 배치·hit-test는 Tailwind 컴파일 CSS로 브라우저에서 측정.
// (같은 폴더의 quick-bar.test.mjs는 최근 본 상품 저장소 시험 — 다른 파일)
const SRC = new URL("../src/app/s/[store]/(shop)/quick-bar.tsx", import.meta.url);
const src = readFileSync(SRC, "utf8");
const req = createRequire(new URL("../package.json", import.meta.url));

async function load() {
  const ts = req("typescript");
  const R = (m) => pathToFileURL(req.resolve(m)).href;
  let js = ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const dir = mkdtempSync(join(tmpdir(), "quick-bar-"));
  const stub = (name, body) => { const p = join(dir, name); writeFileSync(p, body); return pathToFileURL(p).href; };
  const link = stub("link.mjs", `import { createElement } from "${R("react")}"; export default function Link({ href, children, ...r }) { return createElement("a", { href, ...r }, children); }`);
  const recent = stub("recent.mjs", "export const getRecentProducts = () => []; export const removeRecentProduct = () => {}; export const clearRecentProducts = () => {};");
  js = js
    .replace('"use client";', "")
    .replace('from "react/jsx-runtime"', `from "${R("react/jsx-runtime")}"`)
    .replace('from "react"', `from "${R("react")}"`)
    .replace('from "next/link"', `from "${link}"`)
    .replace('from "@/lib/recent-products"', `from "${recent}"`);
  assert.ok(!/from "(@\/|next\/)/.test(js), "바꾸지 못한 import 없음");
  return import(stub("quick-bar.mjs", js));
}

const classes = (el) => el.getAttribute("class").split(/\s+/);
const toggles = (root) => [...root.querySelectorAll('[data-quickbar="toggle"]')];
const narrowOnly = (el) => classes(el).includes("md:hidden");
const wideOnly = (el) => classes(el).includes("max-md:hidden");

function checkFirstView(root) {
  const ts = toggles(root);
  assert.equal(ts.length, 2, "안 누른 동안은 폭별 손잡이 두 개");
  const narrow = ts.find(narrowOnly), wide = ts.find(wideOnly);
  assert.ok(narrow && wide && narrow !== wide);
  // 767px 이하에서 보이는 손잡이 = 접힌 상태(펼치기), 768px 이상 = 펼친 상태(접기) — 첫 화면부터 일치(P3)
  assert.equal(narrow.getAttribute("aria-label"), "퀵바 펼치기");
  assert.equal(narrow.getAttribute("aria-expanded"), "false");
  assert.equal(wide.getAttribute("aria-label"), "퀵바 접기");
  assert.equal(wide.getAttribute("aria-expanded"), "true");
  assert.equal(root.querySelector('[data-quickbar="collapsed"]'), null, "누르기 전엔 미니 바 없음");
  const ex = root.querySelector('[data-quickbar="expanded"]');
  assert.ok(classes(ex).includes("max-md:hidden") && !classes(ex).includes("md:hidden"), "펼친 패널 = 768px 이상에서만(기존 기본값)");
  return { narrow, wide };
}

test("서버 첫 화면: 폭별 손잡이 두 개(숨은 쪽 display:none), 이름·aria-expanded가 보이는 모양과 일치", async () => {
  const React = req("react");
  const { renderToString } = req("react-dom/server");
  const { default: QuickBar } = await load();
  const { Window } = req("happy-dom");
  const win = new Window();
  const host = win.document.createElement("div");
  host.innerHTML = renderToString(React.createElement(QuickBar, { slug: "s", base: "/s/s", cartCount: 0 }));
  checkFirstView(host);
  await win.happyDOM.close();
});

test("손잡이 배치 class: 767px 이하 여백 안(640 미만 16px·이상 24px, 높이 56px, 화면 끝에 붙음), 768px 이상 기존 20×40px", () => {
  const t = src.slice(src.indexOf("const toggle ="), src.indexOf("return (\n    <aside"));
  for (const c of ["max-md:-left-4", "max-md:w-4", "max-md:h-14", "sm:max-md:-left-6", "sm:max-md:w-6", "-left-5", "h-10", "w-5"]) assert.ok(t.includes(c), c);
  assert.match(src, /className="fixed right-2\.5 max-md:right-0 top-1\/2/, "767px 이하 화면 오른쪽 끝에 붙음");
  assert.ok(!/matchMedia/.test(src), "화면 폭을 JS로 읽지 않음(서버·하이드레이션 차이 없음)");
});

async function mount() {
  const { Window } = req("happy-dom");
  const win = new Window({ url: "http://localhost/" });
  for (const k of ["window", "document", "navigator", "HTMLElement", "Node", "Event", "MouseEvent"]) Object.defineProperty(globalThis, k, { value: k === "window" ? win : win[k], configurable: true, writable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = req("react");
  const { createRoot } = req("react-dom/client");
  const { default: QuickBar } = await load();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(QuickBar, { slug: "s", base: "/s/s", cartCount: 0 })));
  const click = (el) => React.act(async () => el.click());
  return { host, click, close: () => win.happyDOM.close() };
}

test("휴대폰 폭 흐름: 손잡이(펼치기) → 펼친 패널(폭 상관없이) → 접기 → 휴대폰 폭은 손잡이만, 「최근 본 상품 열기」도 펼침", async () => {
  const h = await mount();
  const { narrow } = checkFirstView(h.host);
  await h.click(narrow);
  let ts = toggles(h.host);
  assert.equal(ts.length, 1, "누른 뒤엔 손잡이 하나");
  assert.equal(ts[0].getAttribute("aria-label"), "퀵바 접기");
  assert.equal(ts[0].getAttribute("aria-expanded"), "true");
  assert.ok(!narrowOnly(ts[0]) && !wideOnly(ts[0]));
  const ex = h.host.querySelector('[data-quickbar="expanded"]');
  assert.ok(ex && !classes(ex).includes("max-md:hidden"), "펼친 패널이 폭과 상관없이 보임");
  assert.equal(h.host.querySelector('[data-quickbar="collapsed"]'), null);
  await h.click(ts[0]);
  ts = toggles(h.host);
  assert.equal(ts.length, 1);
  assert.equal(ts[0].getAttribute("aria-label"), "퀵바 펼치기");
  assert.equal(ts[0].getAttribute("aria-expanded"), "false");
  assert.equal(h.host.querySelector('[data-quickbar="expanded"]'), null);
  const col = h.host.querySelector('[data-quickbar="collapsed"]');
  assert.ok(col && classes(col).includes("max-md:hidden"), "다시 접으면 휴대폰 폭은 손잡이만(768px 이상은 기존 미니 바)");
  await h.click(col.querySelector('button[title="최근 본 상품 열기"]'));
  assert.ok(h.host.querySelector('[data-quickbar="expanded"]') && !h.host.querySelector('[data-quickbar="collapsed"]'));
  await h.close();
});

test("컴퓨터 폭 흐름: 손잡이(접기) → 기존 미니 바, 다시 펼치기 → 펼친 패널", async () => {
  const h = await mount();
  const { wide } = checkFirstView(h.host);
  await h.click(wide);
  let ts = toggles(h.host);
  assert.equal(ts.length, 1);
  assert.equal(ts[0].getAttribute("aria-label"), "퀵바 펼치기");
  assert.equal(ts[0].getAttribute("aria-expanded"), "false");
  const col = h.host.querySelector('[data-quickbar="collapsed"]');
  assert.ok(col && !classes(col).includes("md:hidden"), "768px 이상 접힘 = 기존 미니 바");
  await h.click(ts[0]);
  assert.ok(h.host.querySelector('[data-quickbar="expanded"]'));
  assert.equal(toggles(h.host)[0].getAttribute("aria-expanded"), "true");
  await h.close();
});

test("손잡이는 진짜 button(키보드 Tab·Enter·Space 기본 동작), 정보 손실 없음", () => {
  assert.match(src, /<button\s+type="button"\s+onClick=\{\(\) => setCollapsedPref\(!collapsed\)\}/);
  assert.ok(!src.includes("setIsCollapsed"), "옛 상태 이름 남지 않음");
  assert.ok(src.includes("장바구니") && src.includes("최근본상품") && src.includes("TOP") && src.includes("DOWN"));
});
