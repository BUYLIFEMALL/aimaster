import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(new URL("../extension/auto-publish.js", import.meta.url), "utf8");
function controller(mode) {
  const commands = [], requests = [], elements = new Map();
  const sandbox = vm.createContext({
    BASE: "https://test.invalid", seoAutoBusy: true,
    seoPublication: { draftId: "draft1", runId: "run1", title: "제목", blogId: "my_blog", visibility: "private", tabId: 3, state: "writing" },
    activeWebDraftBlocks: [], activeWebDraftBody: "본문", activeWebDraftId: "draft1", activeWebDraftContentImages: [], activeWebDraftCoverDataUrl: "",
    webDrafts: [{ id: "draft1", image_summary: { contentCount: 0 } }],
    plainText: value => value, getToken: async () => "own", sleep: async () => {}, seoAutoPublishPage() {},
    openNaverPublishSettings: async () => {}, activeDraftNaverCategory: () => null,
    $: id => { if (!elements.has(id)) elements.set(id, { value: "", addEventListener() {}, textContent: "" }); return elements.get(id); },
    chrome: { tabs: { get: async () => ({ url: "https://blog.naver.com/my_blog/postwrite" }) },
      storage: { local: { set: async () => {}, get: async () => ({}) } },
      scripting: { executeScript: async ({ args }) => { commands.push(args[0]); return [{ result: args[0] === "published" ? { complete: false } : { ok: true, clicked: true } }]; } },
    },
    fetch: async (_url, options) => {
      const { action } = JSON.parse(options.body); requests.push(action);
      if (mode === "arm-lost" && action === "arm") throw new Error("ACK response lost");
      return { ok: true, json: async () => ({ publication: { runId: "run1", state: action === "uncertain" ? "uncertain" : "publishing" } }) };
    },
  });
  vm.runInContext(source, sandbox);
  return { sandbox, commands, requests };
}
test("lost arm ACK stops before the final click", async () => {
  const s = controller("arm-lost");
  await assert.rejects(s.sandbox.finishAutoPublication(), /ACK response lost/);
  assert.deepEqual(s.commands, ["verify", "settings"]);
  assert.deepEqual(s.requests, ["arm"]);
});
test("reconcile checks results without clicking or arming again", async () => {
  const s = controller("uncertain");
  await assert.rejects(s.sandbox.reconcileAutoPublication(), /발행 결과가 불확실/);
  assert.deepEqual(s.requests, ["status", "uncertain"]);
  assert.equal(s.commands.length, 40);
  assert.equal(s.commands.every(command => command === "published"), true);
});

// 2026-10-23: a run cut off by closing/reloading the side panel is closed as failed on the next open,
// but a run still refreshed by another open panel, or one already past "writing", is left alone.
async function recovery({ aliveAgoMs, serverState }) {
  const requests = [], elements = new Map();
  const sandbox = vm.createContext({
    BASE: "https://test.invalid", seoAutoBusy: false, seoPublication: null, Date,
    plainText: value => value, getToken: async () => "own", sleep: async () => {}, seoAutoPublishPage() {},
    $: id => { if (!elements.has(id)) elements.set(id, { value: "", addEventListener() {}, textContent: "" }); return elements.get(id); },
    chrome: { storage: { local: { set: async () => {}, get: async () => ({ seo_publish_outbox_v1: { draftId: "draft1", runId: "run1", tabId: 3, aliveAt: Date.now() - aliveAgoMs } }) } } },
    fetch: async (_url, options) => {
      const { action } = JSON.parse(options.body); requests.push(action);
      return { ok: true, json: async () => ({ publication: { runId: "run1", state: action === "failed" ? "failed" : serverState } }) };
    },
  });
  vm.runInContext(source, sandbox);
  for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve));
  return { requests, status: elements.get("generateStatus")?.textContent || "", sandbox };
}
test("panel reopen closes a writing run that stopped refreshing", async () => {
  const r = await recovery({ aliveAgoMs: 5 * 60 * 1000, serverState: "writing" });
  assert.deepEqual(r.requests, ["status", "failed"]);
  assert.match(r.status, /중간에 멈춰 정리/);
  assert.equal(r.sandbox.seoPublication, null);
});
test("panel reopen leaves a run that another panel is still refreshing", async () => {
  const r = await recovery({ aliveAgoMs: 10 * 1000, serverState: "writing" });
  assert.deepEqual(r.requests, []);
});
test("panel reopen never fails a run already publishing", async () => {
  const r = await recovery({ aliveAgoMs: 5 * 60 * 1000, serverState: "publishing" });
  assert.deepEqual(r.requests, ["status"]);
});
