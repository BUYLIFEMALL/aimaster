import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// B2B-20261119-HOMETABS — 홈 상품 탭 블록(TabsView) 대비·키보드. Mac msg_f97fee71a875(←무반응·tabIndex 0 여러 개),
// MOV-10 측정 원본의 밑줄 미선택 탭 4.15:1(slate-500 on #0c0a09). 실제 컴포넌트를 happy-dom에 그려 키 이벤트를 보낸다.
const SRC = new URL("../src/app/s/[store]/home-blocks.tsx", import.meta.url);
const src = readFileSync(SRC, "utf8");
const req = createRequire(new URL("../package.json", import.meta.url));

async function loadTabs() {
  const ts = req("typescript");
  const R = (m) => pathToFileURL(req.resolve(m)).href;
  let js = ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  js = js
    .replace('from "react/jsx-runtime"', `from "${R("react/jsx-runtime")}"`)
    .replace('from "react"', `from "${R("react")}"`)
    .replace('from "@/lib/blocks"', `from "${new URL("../src/lib/blocks.ts", import.meta.url).href}"`);
  const dir = mkdtempSync(join(tmpdir(), "home-tabs-"));
  const p = join(dir, "home-blocks.mjs");
  writeFileSync(p, js);
  return import(pathToFileURL(p).href);
}

async function mount(el) {
  const { Window } = req("happy-dom");
  const win = new Window({ url: "http://localhost/" });
  for (const k of ["window", "document", "navigator", "HTMLElement", "Node", "KeyboardEvent", "MouseEvent", "Event"]) Object.defineProperty(globalThis, k, { value: k === "window" ? win : win[k], configurable: true, writable: true });
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = req("react");
  const { createRoot } = req("react-dom/client");
  const root = document.createElement("div");
  document.body.appendChild(root);
  const r = createRoot(root);
  await React.act(async () => r.render(el));
  return { win, root, React, rerender: (e) => React.act(async () => r.render(e)), close: () => win.happyDOM.close() };
}

test("tabKeyIndex: →/← 순환, Home/End 처음·끝, 위/아래·Tab·Enter·빈 목록은 null", async () => {
  const { tabKeyIndex } = await loadTabs();
  assert.equal(tabKeyIndex("ArrowRight", 2, 3), 0);
  assert.equal(tabKeyIndex("ArrowLeft", 0, 3), 2);
  assert.equal(tabKeyIndex("ArrowRight", 0, 3), 1);
  assert.equal(tabKeyIndex("Home", 2, 3), 0);
  assert.equal(tabKeyIndex("End", 0, 3), 2);
  for (const k of ["ArrowUp", "ArrowDown", "Tab", "Enter", " "]) assert.equal(tabKeyIndex(k, 1, 3), null, k);
  assert.equal(tabKeyIndex("ArrowRight", 0, 0), null);
});

test("실제 키 이벤트: 로빙 tabIndex(0은 하나), ←/→/Home/End로 선택·초점 이동, 탭·패널 일대일 id/aria, 안 고른 패널은 hidden 빈 상자, 두 블록 ID 안 겹침", async () => {
  const { TabsView } = await loadTabs();
  const h = await mount(null);
  const { React, root, win } = h;
  const block = (title, skin) => React.createElement(TabsView, { title, skin, labels: ["플로럴", "우디", "시트러스"], panels: ["P0", "P1", "P2"].map((t) => React.createElement("ul", { "data-panel": t }, t)) });
  await h.rerender(React.createElement("div", null, block("향 계열", "line"), block("추천", undefined)));
  const lists = [...root.querySelectorAll("[role=tablist]")];
  assert.equal(lists.length, 2);
  const state = (list) => {
    const tabs = [...list.querySelectorAll("[role=tab]")];
    const panels = [...list.parentElement.querySelectorAll("[role=tabpanel]")];
    const shown = panels.filter((p) => !p.hidden);
    return { tabs, panels, shown, sel: tabs.findIndex((t) => t.getAttribute("aria-selected") === "true"), tab0: tabs.filter((t) => t.tabIndex === 0).length };
  };
  // 일대일: 탭 j → 패널 j(aria-controls ↔ id, aria-labelledby ↔ 탭 id), 고른 패널만 보이고 내용, 안 고른 패널은 hidden 빈 상자
  const pairs = (s) => {
    assert.equal(s.panels.length, s.tabs.length, "탭마다 패널");
    s.tabs.forEach((t, j) => {
      const p = s.panels[j];
      assert.equal(t.getAttribute("aria-controls"), p.id, `탭 ${j} → 패널 ${j}`);
      assert.equal(p.getAttribute("aria-labelledby"), t.id, `패널 ${j} ← 탭 ${j}`);
      assert.equal(p.hidden, j !== s.sel, `패널 ${j} 보임 여부`);
      assert.equal(p.childElementCount, j === s.sel ? 1 : 0, `패널 ${j} 내용(안 고른 패널은 비어 있음)`);
      if (j !== s.sel) assert.notEqual(p.tabIndex, 0, "숨은 패널은 Tab 대상 아님");
    });
    assert.equal(s.shown.length, 1, "보이는 패널 하나");
    assert.equal(s.shown[0].tabIndex, 0);
  };
  for (const list of lists) {
    const s = state(list);
    assert.equal(s.tab0, 1, "Tab으로 들어가는 탭은 하나");
    pairs(s);
  }
  const ids = [...root.querySelectorAll("[role=tab],[role=tabpanel]")].map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "여러 블록이어도 id 안 겹침");
  assert.ok(ids.every(Boolean));
  const key = async (list, k) => { await React.act(async () => list.dispatchEvent(new win.KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }))); };
  const [line] = lists;
  state(line).tabs[0].focus();
  await key(line, "ArrowLeft");
  let s = state(line);
  assert.equal(s.sel, 2, "← 처음에서 끝으로 순환");
  assert.equal(document.activeElement, s.tabs[2], "초점도 함께");
  assert.equal(line.parentElement.querySelectorAll("[data-panel]").length, 1, "본문은 고른 패널 하나에만");
  assert.equal(line.parentElement.querySelector("[data-panel]").getAttribute("data-panel"), "P2");
  pairs(s);
  await key(line, "ArrowRight");
  assert.equal(state(line).sel, 0);
  await key(line, "End");
  assert.equal(state(line).sel, 2);
  await key(line, "Home");
  s = state(line);
  assert.equal(s.sel, 0);
  assert.equal(s.tab0, 1);
  assert.equal(document.activeElement, s.tabs[0]);
  pairs(s);
  // 클릭으로 고르기는 그대로
  await React.act(async () => s.tabs[1].click());
  assert.equal(state(line).sel, 1);
  pairs(state(line));
  // 다른 블록은 영향 없음
  assert.equal(state(lists[1]).sel, 0);
  await h.close();
});

test("편집기에서 탭 수가 줄면 선택이 마지막 탭으로 — 빈 패널·범위 밖 없음", async () => {
  const { TabsView } = await loadTabs();
  const h = await mount(null);
  const { React, root } = h;
  const el = (labels) => React.createElement(TabsView, { title: "t", labels, panels: labels.map((l) => React.createElement("ul", { "data-panel": l }, l)) });
  await h.rerender(el(["a", "b", "c"]));
  await React.act(async () => root.querySelectorAll("[role=tab]")[2].click());
  await h.rerender(el(["a", "b"]));
  const tabs = [...root.querySelectorAll("[role=tab]")];
  assert.equal(tabs.findIndex((t) => t.getAttribute("aria-selected") === "true"), 1);
  assert.equal(tabs.filter((t) => t.tabIndex === 0).length, 1);
  assert.equal(root.querySelector("[data-panel]").getAttribute("data-panel"), "b");
  assert.equal(root.querySelectorAll("[role=tabpanel]").length, 2, "줄어든 탭 수만큼 패널");
  assert.equal(root.querySelectorAll("[data-panel]").length, 1);
  await h.close();
});

test("색: 밑줄 미선택 탭 text-slate-600(4.15 → 밝게 6.95~7.58·어둡게 6.57~7.51), 선택 탭·알약 스킨·hover 그대로", () => {
  const code = src.slice(src.indexOf("export function TabsView"), src.indexOf("export function Countdown"));
  assert.ok(code.includes('"border-transparent text-slate-600 hover:text-slate-800"'), "밑줄 미선택");
  assert.ok(!/text-slate-500/.test(code), "slate-500 없음");
  assert.ok(code.includes('"border-slate-900 text-slate-900"'), "밑줄 선택 그대로");
  assert.ok(code.includes('"bg-slate-900 text-white shadow-xs" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"'), "알약 그대로");
  assert.ok(code.includes("data-tabs") && code.includes("data-tabs-skin"), "data 속성 유지");
});
