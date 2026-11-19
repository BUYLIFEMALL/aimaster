import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// FRONT-20261119-QUICKBAR — 주인님 휴대폰 실기기에서 오른쪽 빠른 메뉴가 처음부터 펼쳐져 상품 카드를 가림.
// 767px 이하는 처음에 접힌 바, 768px 이상은 기존처럼 펼친 패널(CSS로 결정 — 서버 첫 화면부터), 누른 뒤에는 누른 상태.
// 실제 컴포넌트를 happy-dom에 그려 확인한다(네트워크·DB 0).
const SRC = new URL("../src/app/s/[store]/(shop)/quick-bar.tsx", import.meta.url);
const req = createRequire(new URL("../package.json", import.meta.url));

async function load() {
  const ts = req("typescript");
  const R = (m) => pathToFileURL(req.resolve(m)).href;
  let js = ts.transpileModule(readFileSync(SRC, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
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

async function mount(width) {
  const { Window } = req("happy-dom");
  const win = new Window({ url: "http://localhost/", width, height: 800 });
  for (const k of ["window", "document", "navigator", "HTMLElement", "Node", "Event", "MouseEvent"]) Object.defineProperty(globalThis, k, { value: k === "window" ? win : win[k], configurable: true, writable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = req("react");
  const { createRoot } = req("react-dom/client");
  const { default: QuickBar } = await load();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(QuickBar, { slug: "s", base: "/s/s", cartCount: 0 })));
  const q = () => ({
    collapsed: host.querySelector('[data-quickbar="collapsed"]'),
    expanded: host.querySelector('[data-quickbar="expanded"]'),
    toggle: host.querySelector('button[aria-label^="퀵바"]'),
  });
  return { React, q, close: () => win.happyDOM.close() };
}

test("서버 첫 화면(누르기 전): 767px 이하는 손잡이만(패널·미니 바 없음), 768px 이상은 펼친 패널(기존 기본값)", async () => {
  const React = req("react");
  const { renderToString } = req("react-dom/server");
  const { default: QuickBar, NARROW_QUERY } = await load();
  assert.equal(NARROW_QUERY, "(max-width: 767px)");
  const html = renderToString(React.createElement(QuickBar, { slug: "s", base: "/s/s", cartCount: 0 }));
  const cls = (name) => html.match(new RegExp(`data-quickbar="${name}" class="([^"]*)"`))?.[1].split(/\s+/);
  assert.equal(cls("collapsed"), undefined, "누르기 전엔 미니 바 없음");
  assert.ok(cls("expanded").includes("max-md:hidden") && !cls("expanded").includes("md:hidden"), "펼친 패널 = 데스크톱 폭에서만");
  const t = cls("toggle");
  assert.ok(t.includes("max-md:h-11") && t.includes("max-md:w-6"), "휴대폰 손잡이 24×44px");
  assert.ok(t.includes("h-10") && t.includes("w-5"), "데스크톱 손잡이 그대로");
});

for (const width of [375, 390]) {
  test(`${width}px: 처음엔 접힘(단추 이름·aria-expanded), 펼치기 → 펼친 패널만, 접기 → 접힌 바만`, async () => {
    const h = await mount(width);
    let s = h.q();
    assert.equal(s.toggle.getAttribute("aria-label"), "퀵바 펼치기");
    assert.equal(s.toggle.getAttribute("aria-expanded"), "false");
    await h.React.act(async () => s.toggle.click());
    s = h.q();
    assert.equal(s.collapsed, null, "펼친 뒤 접힌 바 없음");
    assert.ok(s.expanded && !s.expanded.className.includes("max-md:hidden"), "누른 뒤에는 폭과 상관없이 보임");
    assert.equal(s.toggle.getAttribute("aria-label"), "퀵바 접기");
    assert.equal(s.toggle.getAttribute("aria-expanded"), "true");
    await h.React.act(async () => s.toggle.click());
    s = h.q();
    assert.equal(s.expanded, null);
    assert.ok(s.collapsed && s.collapsed.className.split(/\s+/).includes("max-md:hidden"), "다시 접으면 휴대폰 폭은 손잡이만");
    // 접힌 바의 「최근 본 상품 열기」도 펼침(768px 이상에서 보이는 단추)
    await h.React.act(async () => h.q().collapsed.querySelector('button[title="최근 본 상품 열기"]').click());
    assert.ok(h.q().expanded && !h.q().collapsed);
    await h.close();
  });
}

for (const width of [768, 1280]) {
  test(`${width}px: 처음엔 펼침(기존 데스크톱 기본값 유지), 접기 → 접힌 바만`, async () => {
    const h = await mount(width);
    let s = h.q();
    assert.equal(s.toggle.getAttribute("aria-label"), "퀵바 접기");
    assert.equal(s.toggle.getAttribute("aria-expanded"), "true");
    await h.React.act(async () => s.toggle.click());
    s = h.q();
    assert.equal(s.expanded, null);
    assert.ok(s.collapsed && !s.collapsed.className.split(/\s+/).includes("md:hidden"), "768px 이상 접힘 = 기존 미니 바");
    assert.equal(s.toggle.getAttribute("aria-label"), "퀵바 펼치기");
    await h.close();
  });
}

test("단추는 진짜 button(키보드 Tab·Enter·Space 기본 동작), 정보 손실 없음", () => {
  const src = readFileSync(SRC, "utf8");
  assert.match(src, /<button\s+type="button"\s+onClick=\{\(\) => setCollapsedPref\(!isCollapsed\)\}/);
  assert.ok(!src.includes("setIsCollapsed"), "옛 상태 이름 남지 않음");
  assert.ok(src.includes("장바구니") && src.includes("최근본상품") && src.includes("TOP") && src.includes("DOWN"));
});
