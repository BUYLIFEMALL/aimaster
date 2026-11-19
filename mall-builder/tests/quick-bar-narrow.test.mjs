import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// FRONT-20261119-QUICKBAR 최종안 A — 주인님 휴대폰 실기기에서 오른쪽 빠른 메뉴가 상품 카드를 가림.
// 1379px 이하: 떠 있는 손잡이 없이 머리글 카테고리 줄 오른쪽 끝 단추(QuickBarOpener, 40×40)로 열고 닫는다.
// 카테고리·메뉴 없는 상점은 1379px 이하에서만 단추 한 개짜리 줄. 1380px 이상: 기존 펼친 패널·손잡이 20×40 그대로.
// 실제 컴포넌트(quick-bar.tsx·shop-frame.tsx)를 happy-dom에 그려 확인한다(네트워크·DB 0).
// (같은 폴더의 quick-bar.test.mjs는 최근 본 상품 저장소 시험 — 다른 파일)
const SHOP = new URL("../src/app/s/[store]/(shop)/", import.meta.url);
const qbSrc = readFileSync(new URL("quick-bar.tsx", SHOP), "utf8");
const frameSrc = readFileSync(new URL("shop-frame.tsx", SHOP), "utf8");
const req = createRequire(new URL("../package.json", import.meta.url));

let loaded;
async function load() {
  if (loaded) return loaded;
  const ts = req("typescript");
  const R = (m) => pathToFileURL(req.resolve(m)).href;
  const dir = mkdtempSync(join(tmpdir(), "quick-bar-"));
  const put = (name, body) => { const p = join(dir, name); writeFileSync(p, body); return pathToFileURL(p).href; };
  const tx = (s) => ts.transpileModule(s, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
    .replace('"use client";', "")
    .replace('from "react/jsx-runtime"', `from "${R("react/jsx-runtime")}"`)
    .replace(/from "react"/g, `from "${R("react")}"`);
  const link = put("link.mjs", `import { createElement } from "${R("react")}"; export default function Link({ href, children, ...r }) { return createElement("a", { href, ...r }, children); }`);
  const recent = put("recent.mjs", "export const getRecentProducts = () => []; export const removeRecentProduct = () => {}; export const clearRecentProducts = () => {};");
  const qb = put("quick-bar.mjs", tx(qbSrc).replace('from "next/link"', `from "${link}"`).replace('from "@/lib/recent-products"', `from "${recent}"`));
  const frame = put("shop-frame.mjs", tx(frameSrc).replace('from "next/link"', `from "${link}"`).replace('from "./quick-bar"', `from "${qb}"`));
  for (const f of [qb, frame]) assert.ok(!/from "(@\/|next\/|\.\/)/.test(readFileSync(new URL(f), "utf8")), "바꾸지 못한 import 없음");
  loaded = { qb: await import(qb), frame: await import(frame) };
  return loaded;
}

const header = (over = {}) => ({ logo: "", search: "icon", show_categories: true, menu: [], ...over });
const cls = (el) => el.getAttribute("class").split(/\s+/);

async function ssr(el) {
  const { renderToString } = req("react-dom/server");
  const { Window } = req("happy-dom");
  const win = new Window();
  const host = win.document.createElement("div");
  host.innerHTML = renderToString(el);
  return { host, close: () => win.happyDOM.close() };
}

test("서버 첫 화면 빠른 메뉴: 1379px 이하 아무것도 안 보임(손잡이·패널 모두 숨김), 1380px 이상 기존 펼친 패널+손잡이(접기/true)", async () => {
  const React = req("react");
  const { qb } = await load();
  const h = await ssr(React.createElement(qb.default, { slug: "s", base: "/s/s", cartCount: 0 }));
  const toggles = [...h.host.querySelectorAll('[data-quickbar="toggle"]')];
  assert.equal(toggles.length, 1);
  assert.ok(cls(toggles[0]).includes("max-[86.25rem]:hidden"), "손잡이는 1380px 이상만");
  assert.equal(toggles[0].getAttribute("aria-label"), "퀵바 접기");
  assert.equal(toggles[0].getAttribute("aria-expanded"), "true");
  for (const c of ["h-10", "w-5", "-left-5"]) assert.ok(cls(toggles[0]).includes(c), `PC 손잡이 그대로 ${c}`);
  const ex = h.host.querySelector('[data-quickbar="expanded"]');
  assert.ok(cls(ex).includes("max-[86.25rem]:hidden"), "펼친 패널 = 1380px 이상에서만(기존 기본값)");
  assert.equal(ex.id, qb.QUICKBAR_PANEL_ID);
  assert.ok(cls(ex.querySelector('[data-quickbar="panel-close"]')).includes("min-[86.25rem]:hidden"), "패널 닫기 단추 = 1379px 이하만");
  assert.equal(h.host.querySelector('[data-quickbar="collapsed"]'), null);
  assert.ok(!/max-md:right-0|max-md:-left-4|max-md:h-14/.test(qbSrc), "이전 보완안(여백 안 손잡이) 흔적 없음");
  await h.close();
});

test("머리글: 카테고리 줄 오른쪽 끝에 단추(1379px 이하, 40×40, 열기/false, aria-controls), 카테고리 없는 상점은 1379px 이하 단추 줄, 쇼핑 안 보이면 없음", async () => {
  const React = req("react");
  const { frame, qb } = await load();
  const props = (over) => ({ base: "/s/s", storeName: "몰", header: header(), categories: [{ id: "c1", name: "가전" }], showShop: true, right: null, ...over });
  // 1) 카테고리 있음
  let h = await ssr(React.createElement(frame.ShopHeader, props()));
  let op = h.host.querySelectorAll('[data-quickbar="opener"]');
  assert.equal(op.length, 1);
  const row = op[0].parentElement;
  assert.ok(row.querySelector("[data-shop-menu]"), "카테고리 줄 안");
  assert.equal(row.lastElementChild, op[0], "줄 오른쪽 끝(스크롤 줄 밖)");
  assert.ok(!row.querySelector("[data-shop-menu]").contains(op[0]), "가로 스크롤되는 nav 밖 — 늘 보임");
  for (const c of ["min-[86.25rem]:hidden", "h-10", "w-10", "shrink-0"]) assert.ok(cls(op[0]).includes(c), c);
  assert.equal(op[0].getAttribute("aria-label"), "빠른 메뉴 열기");
  assert.equal(op[0].getAttribute("aria-expanded"), "false");
  assert.equal(op[0].getAttribute("aria-controls"), qb.QUICKBAR_PANEL_ID);
  assert.ok(!cls(row).includes("min-[86.25rem]:hidden"), "카테고리 줄 자체는 PC에서도 그대로");
  await h.close();
  // 2) 카테고리·메뉴 없음
  h = await ssr(React.createElement(frame.ShopHeader, props({ categories: [], header: header({ show_categories: false }) })));
  op = h.host.querySelectorAll('[data-quickbar="opener"]');
  assert.equal(op.length, 1);
  assert.ok(cls(op[0].parentElement).includes("min-[86.25rem]:hidden"), "단추만 든 줄은 1379px 이하에서만(PC 머리글 높이 그대로)");
  assert.equal(h.host.querySelector("[data-shop-menu]"), null);
  await h.close();
  // 3) 쇼핑 화면 아님(문 닫힌 몰 등)
  h = await ssr(React.createElement(frame.ShopHeader, props({ showShop: false })));
  assert.equal(h.host.querySelector('[data-quickbar="opener"]'), null);
  await h.close();
});

test("편집기 미리보기(quickBar=false): 패널이 없으니 단추 없음 — 카테고리 줄은 그대로(여백 원래대로), 카테고리 없는 상점은 빈 단추 줄 없음. 상점(기본값)은 단추 있음", async () => {
  const React = req("react");
  const { frame } = await load();
  const base = { base: "/s/s", storeName: "몰", header: header(), categories: [{ id: "c1", name: "가전" }], showShop: true, right: null };
  // 미리보기 + 카테고리 있음
  let h = await ssr(React.createElement(frame.ShopHeader, { ...base, quickBar: false }));
  assert.equal(h.host.querySelector('[data-quickbar="opener"]'), null, "미리보기엔 단추 없음");
  const nav = h.host.querySelector("[data-shop-menu]");
  assert.ok(nav && nav.textContent.includes("가전"), "카테고리 줄은 정상");
  assert.ok(!cls(nav).includes("max-md:pr-2"), "단추 없을 땐 줄 오른쪽 여백 원래대로(px-4)");
  assert.ok(cls(nav).includes("px-4") && cls(nav).includes("sm:px-6"));
  await h.close();
  // 미리보기 + 카테고리·메뉴 없음 → 두 번째 줄 자체가 없음
  h = await ssr(React.createElement(frame.ShopHeader, { ...base, quickBar: false, categories: [], header: header({ show_categories: false }) }));
  const head = h.host.querySelector("header");
  assert.equal(head.children.length, 1, "빈 단추 줄 없음(머리글 윗줄만)");
  assert.equal(h.host.querySelector('[data-quickbar="opener"]'), null);
  await h.close();
  // 상점(값 생략 = 기본 true)
  h = await ssr(React.createElement(frame.ShopHeader, base));
  assert.equal(h.host.querySelectorAll('[data-quickbar="opener"]').length, 1, "상점은 기본으로 단추 있음");
  await h.close();
  // 실제 호출부: 편집기 미리보기 한 곳만 false, 상점 레이아웃은 기본값
  const editor = readFileSync(new URL("../src/app/s/[store]/admin/design/design-editor.tsx", import.meta.url), "utf8");
  const layout = readFileSync(new URL("layout.tsx", SHOP), "utf8");
  assert.equal((editor.match(/<ShopHeader[^>]*quickBar=\{false\}/g) || []).length, 1, "미리보기 호출에 quickBar={false}");
  assert.ok(!/quickBar=\{false\}/.test(layout), "상점 레이아웃은 끄지 않음");
  assert.match(layout, /\{showShop && <QuickBar /, "상점은 패널도 같은 조건(showShop)으로 그려짐");
});

async function mountBoth() {
  const { Window } = req("happy-dom");
  const win = new Window({ url: "http://localhost/" });
  for (const k of ["window", "document", "navigator", "HTMLElement", "Node", "Event", "MouseEvent", "KeyboardEvent", "CustomEvent"]) Object.defineProperty(globalThis, k, { value: k === "window" ? win : win[k], configurable: true, writable: true });
  // 숨김 CSS가 없는 happy-dom에서 「보이는 요소」 판정: min-[86.25rem]:hidden(1379px 이하만 보임)은 보임, max-[86.25rem]:hidden은 숨김으로 흉내(휴대폰 폭)
  win.HTMLElement.prototype.getClientRects = function () {
    for (let e = this; e; e = e.parentElement) if (e.getAttribute?.("class")?.split(/\s+/).includes("max-[86.25rem]:hidden")) return [];
    return [{ width: 1, height: 1 }];
  };
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const React = req("react");
  const { createRoot } = req("react-dom/client");
  const { qb, frame } = await load();
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement("div", null,
    React.createElement(frame.ShopHeader, { base: "/s/s", storeName: "몰", header: header(), categories: [{ id: "c1", name: "가전" }], showShop: true, right: null }),
    React.createElement("main", null, React.createElement("a", { href: "/s/s/p/1" }, "상품")),
    React.createElement(qb.default, { slug: "s", base: "/s/s", cartCount: 0 }))));
  const act = (fn) => React.act(async () => fn());
  const $ = (q) => host.querySelector(q);
  return { win, host, act, $, close: () => win.happyDOM.close() };
}

test("헤더 빠른 메뉴 흐름: 단추 → 열림(단추 닫기/true, 패널 보임, 포커스 패널 닫기) → 패널 닫기 → 닫힘·포커스 단추 복귀 → 다시 열고 Esc → 닫힘·포커스 단추", async () => {
  const h = await mountBoth();
  const opener = h.$('[data-quickbar="opener"]');
  // Tab 순서: 머리글 단추가 본문 링크보다 앞, 패널 닫기는 패널 첫 단추
  const focusables = [...h.host.querySelectorAll("a,button")];
  assert.ok(focusables.indexOf(opener) < focusables.indexOf(h.$("main a")), "머리글 단추가 본문보다 먼저");
  opener.focus();
  await h.act(() => opener.click());
  assert.equal(opener.getAttribute("aria-expanded"), "true");
  assert.equal(opener.getAttribute("aria-label"), "빠른 메뉴 닫기");
  const ex = h.$('[data-quickbar="expanded"]');
  assert.ok(ex && !cls(ex).includes("max-[86.25rem]:hidden"), "패널이 1379px 이하에서도 보임");
  const close = h.$('[data-quickbar="panel-close"]');
  assert.equal(ex.querySelector("a,button"), close, "패널 첫 단추 = 닫기");
  assert.equal(document.activeElement, close, "열면 포커스가 패널로");
  await h.act(() => close.click());
  assert.equal(opener.getAttribute("aria-expanded"), "false");
  assert.ok(cls(h.$('[data-quickbar="expanded"]')).includes("max-[86.25rem]:hidden"), "닫으면 1379px 이하에서 다시 숨김(PC 기본값은 그대로)");
  assert.equal(document.activeElement, opener, "닫으면 포커스가 머리글 단추로");
  // 단추로 다시 닫기
  await h.act(() => opener.click());
  await h.act(() => opener.click());
  assert.equal(opener.getAttribute("aria-expanded"), "false");
  // Esc
  await h.act(() => opener.click());
  assert.equal(document.activeElement, h.$('[data-quickbar="panel-close"]'));
  await h.act(() => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  assert.equal(opener.getAttribute("aria-expanded"), "false");
  assert.equal(document.activeElement, opener, "Esc 뒤 포커스 단추로");
  await h.close();
});

test("PC 흐름 그대로: 손잡이(접기) → 기존 미니 바, 다시 펼치기 → 펼친 패널", async () => {
  const h = await mountBoth();
  const t = () => h.$('[data-quickbar="toggle"]');
  await h.act(() => t().click());
  assert.equal(t().getAttribute("aria-label"), "퀵바 펼치기");
  assert.equal(t().getAttribute("aria-expanded"), "false");
  assert.ok(h.$('[data-quickbar="collapsed"]') && !h.$('[data-quickbar="expanded"]'));
  assert.equal(h.$('[data-quickbar="opener"]').getAttribute("aria-expanded"), "false", "PC에서 접어도 휴대폰 단추 상태는 닫힘");
  await h.act(() => t().click());
  assert.ok(h.$('[data-quickbar="expanded"]') && !h.$('[data-quickbar="collapsed"]'));
  await h.close();
});

test("단추는 진짜 button(키보드 Tab·Enter·Space 기본 동작), 정보 손실 없음", () => {
  assert.equal((qbSrc.match(/<button\s+type="button"/g) || []).length >= 4, true);
  assert.ok(qbSrc.includes("장바구니") && qbSrc.includes("최근본상품") && qbSrc.includes("TOP") && qbSrc.includes("DOWN"));
  assert.ok(!/matchMedia/.test(qbSrc), "화면 폭을 JS로 읽지 않음(서버·하이드레이션 같은 HTML)");
});
