// 실행: node --test tests/   — QA014 ④ 결제 위젯(pay-widget.tsx) 교환 모드 / 기존 주문 모드 회귀를 실제로 그려서 확인한다.
// 토스 SDK는 가짜로 바꾸고(실제 토스·키·네트워크 0), 위젯 소스를 typescript로 변환해 happy-dom 안에서 React로 그린다(새 패키지 0).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { Window } from "happy-dom";
import * as exchanges from "../src/lib/exchanges.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const win = new Window({ url: "https://shop.example.test/s/my-mall/orders/o1/exchange-pay/x1" });
for (const k of ["document", "HTMLElement", "Node", "Event", "MouseEvent"]) globalThis[k] = win[k];
globalThis.window = win;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = require("react");
const { createRoot } = require("react-dom/client");
const { act } = React;

// 토스 SDK 가짜 — 동작은 시험마다 바꾼다
let toss;
const sdk = { loadTossPayments: async (clientKey) => toss.load(clientKey) };

const src = readFileSync(new URL("../src/app/s/[store]/(shop)/orders/[id]/pay/pay-widget.tsx", import.meta.url), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("require", "module", "exports", js)((name) => {
  if (name === "@tosspayments/tosspayments-sdk") return sdk;
  if (name === "@/lib/exchanges") return exchanges;
  return require(name);
}, mod, mod.exports);
const PayWidget = mod.exports.default;

function fakeToss({ loadError, requestError } = {}) {
  const t = { requests: [], rendered: 0 };
  t.load = async () => {
    if (loadError) throw loadError;
    return {
      widgets: () => ({
        setAmount: async () => {},
        renderPaymentMethods: async () => { t.rendered++; },
        renderAgreement: async () => {},
        requestPayment: async (p) => { t.requests.push(p); if (requestError) throw requestError; },
      }),
    };
  };
  return t;
}

const base = { clientKey: "test_ck_fake", customerKey: "c1", amount: 3000, orderId: "exfee-x1", orderName: "교환비 · 티셔츠", customerName: "홍길동", successPath: "/ok", failPath: "/no" };
const flush = () => new Promise((r) => setTimeout(r, 0));

async function mount(props) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => { root.render(React.createElement(PayWidget, props)); });
  await act(async () => { await flush(); await flush(); });
  return { el, root, err: () => el.querySelector("[data-pay-widget-error]")?.textContent ?? "", btn: () => el.querySelector("[data-pay-button]") };
}
async function click(m) { await act(async () => { m.btn().click(); await flush(); await flush(); }); }

const RAW = "test_sk_SECRET raw toss message";

test("교환 모드 렌더: 결제 버튼에 금액, 누르면 한 번만 결제창 요청(주문 번호·성공/실패 주소 그대로)", async () => {
  toss = fakeToss();
  const m = await mount({ ...base, mode: "exchange" });
  assert.match(m.btn().textContent, /3,000원 결제하기/);
  assert.equal(m.btn().disabled, false);
  await click(m);
  assert.equal(toss.requests.length, 1);
  assert.equal(toss.requests[0].orderId, "exfee-x1");
  assert.equal(toss.requests[0].successUrl, "https://shop.example.test/ok");
  assert.equal(toss.requests[0].failUrl, "https://shop.example.test/no");
  m.root.unmount();
});

test("교환 모드 SDK 불러오기 실패: 고정 문구, 원문·키 0", async () => {
  toss = fakeToss({ loadError: new Error(RAW) });
  const m = await mount({ ...base, mode: "exchange" });
  assert.equal(m.err(), exchanges.EXFEE_WIDGET_TEXT.load);
  assert.doesNotMatch(m.el.textContent, /SECRET|test_sk|raw/);
  m.root.unmount();
});

test("교환 모드 결제창 요청 실패: 고정 문구, 원문 0, 자동 재시도 0, 버튼 다시 누를 수 있음", async () => {
  toss = fakeToss({ requestError: Object.assign(new Error(RAW), { code: "INVALID_CARD" }) });
  const m = await mount({ ...base, mode: "exchange" });
  await click(m);
  assert.equal(m.err(), exchanges.EXFEE_WIDGET_TEXT.request);
  assert.doesNotMatch(m.el.textContent, /SECRET|test_sk|raw/);
  await act(async () => { await flush(); await flush(); });
  assert.equal(toss.requests.length, 1, "자동으로 다시 요청 0");
  assert.equal(m.btn().disabled, false);
  m.root.unmount();
});

test("교환 모드 취소: 고정 취소 문구, 주문 자동 취소 안내 0, 자동 결제 0", async () => {
  for (const code of ["USER_CANCEL", "PAY_PROCESS_CANCELED"]) {
    toss = fakeToss({ requestError: Object.assign(new Error(RAW), { code }) });
    const m = await mount({ ...base, mode: "exchange" });
    await click(m);
    assert.equal(m.err(), exchanges.EXFEE_WIDGET_TEXT.cancel, code);
    assert.doesNotMatch(m.el.textContent, /자동으로 취소|SECRET/);
    await act(async () => { await flush(); await flush(); });
    assert.equal(toss.requests.length, 1, `${code}: 취소 뒤 자동 결제 0`);
    m.root.unmount();
  }
});

test("기존 주문 모드(mode 생략) 회귀: 불러오기 실패·요청 실패·취소 문구가 예전 그대로", async () => {
  toss = fakeToss({ loadError: new Error("boom") });
  let m = await mount(base);
  assert.equal(m.err(), "결제창을 불러오지 못했습니다: boom");
  m.root.unmount();

  toss = fakeToss({ requestError: new Error("card declined") });
  m = await mount(base);
  await click(m);
  assert.equal(m.err(), "card declined");
  m.root.unmount();

  toss = fakeToss({ requestError: Object.assign(new Error("x"), { code: "USER_CANCEL" }) });
  m = await mount(base);
  await click(m);
  assert.equal(m.err(), "결제를 취소했습니다. 다시 결제하려면 아래 버튼을 눌러 주세요. 결제하지 않으면 기한이 지나 주문이 자동으로 취소됩니다.");
  m.root.unmount();

  // 기한 지남 문구도 그대로(교환 모드 분기는 기한 확인 뒤라 주문 모드에 영향 0)
  toss = fakeToss();
  m = await mount({ ...base, deadline: "2000-01-01T00:00:00Z" });
  await click(m);
  assert.match(m.err(), /결제 기한이 지나/);
  assert.equal(toss.requests.length, 0);
  m.root.unmount();
});

test("위젯 소스: 교환 분기는 mode === exchange일 때만, 전역 문구 정리·새 SDK·다른 결제 코드 0", () => {
  assert.match(src, /const exchangeMode = props\.mode === "exchange";/);
  assert.equal((src.match(/loadTossPayments\(/g) ?? []).length, 1, "SDK 불러오기 한 번(중복 0)");
  assert.match(src, /exchangeMode \? exfeeWidgetErrorText\("load"\) : `결제창을 불러오지 못했습니다: \$\{e instanceof Error \? e\.message : String\(e\)\}`/);
  assert.match(src, /"결제를 취소했습니다\. 다시 결제하려면 아래 버튼을 눌러 주세요\. 결제하지 않으면 기한이 지나 주문이 자동으로 취소됩니다\."/);
  assert.doesNotMatch(src, /import .*payment"|from "@\/lib\/payment"/);
});
