import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// D32 서비스 워커 — 아무것도 저장하지 않고, 화면 이동 중 연결이 끊기면 안내 화면만 돌려준다
function load(fetchImpl) {
  const handlers = {};
  const self = { addEventListener: (t, f) => (handlers[t] = f), skipWaiting() {}, clients: { claim: async () => {} } };
  vm.runInNewContext(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), { self, fetch: fetchImpl, Response });
  return handlers;
}
const fire = (h, mode) => {
  let res = null;
  h.fetch({ request: { mode }, respondWith: (p) => (res = p) });
  return res;
};

test("화면 이동 중 연결이 끊기면 안내 화면(503)", async () => {
  const h = load(() => Promise.reject(new TypeError("offline")));
  const r = await fire(h, "navigate");
  assert.equal(r.status, 503);
  assert.match(await r.text(), /인터넷 연결이 끊겼습니다/);
});

test("연결되면 원래 응답 그대로, 화면 이동이 아닌 요청은 건드리지 않음", async () => {
  const ok = new Response("ok");
  const h = load(() => Promise.resolve(ok));
  assert.equal(await fire(h, "navigate"), ok);
  assert.equal(fire(h, "cors"), null);
});

test("저장소(caches)를 쓰지 않는다", () => {
  assert.doesNotMatch(readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"), /caches\./);
});
