// 확장 새 버전 안내 검사: whoami 응답 → 사이드패널 배너 (브라우저·네트워크 없음)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../extension/sidepanel.js", import.meta.url), "utf8");
const BASE = "https://tistory-auto-blog-pearl.vercel.app";
const slice = (from, to) => {
  const a = source.indexOf(from), b = source.indexOf(to);
  assert.ok(a >= 0 && b > a, `코드 조각을 찾지 못했습니다: ${from}`);
  return source.slice(a, b);
};
const code = slice("function extensionVersion()", "async function getToken()") + slice("const versionParts", "function renderConnection(result)");

function makeContext(installed) {
  const nodes = {};
  const node = (id) => (nodes[id] ??= { hidden: true, textContent: "", href: "" });
  const context = { BASE, $: node, chrome: { runtime: { getManifest: () => ({ version_name: installed, version: "1.0.0" }) } } };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { context, nodes };
}
const ok = (latestVersion, downloadUrl = `/downloads/tistory-auto-blog-extension-${latestVersion}.zip`) => ({ ok: true, latestVersion, downloadUrl });

test("최신 버전이 더 높으면 배너와 ZIP 링크를 보여준다", () => {
  const { context, nodes } = makeContext("v1.53");
  context.renderUpdateBanner(ok("v1.54"));
  assert.equal(nodes.updateBanner.hidden, false);
  assert.match(nodes.updateBannerText.textContent, /v1\.53 → 최신 v1\.54/);
  assert.equal(nodes.updateBannerLink.href, `${BASE}/downloads/tistory-auto-blog-extension-v1.54.zip`);
});

test("같거나 낮은 버전, 연결 실패, 다른 사이트 주소에서는 숨긴다", () => {
  for (const [installed, result] of [
    ["v1.54", ok("v1.54")],
    ["v1.54", ok("v1.53")],
    ["v1.53", { ok: false, error: "x" }],
    ["v1.53", ok("v1.54", "https://evil.example/x.zip")],
    ["v1.53", ok("v1.54", "/other/path.zip")],
    ["v1.53", ok("garbage")],
    ["v1.53", null],
  ]) {
    const { context, nodes } = makeContext(installed);
    nodes.updateBanner = { hidden: false };
    context.renderUpdateBanner(result);
    assert.equal(nodes.updateBanner.hidden, true, JSON.stringify([installed, result]));
  }
});

test("버전 비교는 숫자로 한다", () => {
  const { context } = makeContext("v1.0");
  assert.equal(context.isNewerVersion("v1.10", "v1.9"), true);
  assert.equal(context.isNewerVersion("v2.01", "v1.99"), true);
  assert.equal(context.isNewerVersion("v1.9", "v1.10"), false);
});
