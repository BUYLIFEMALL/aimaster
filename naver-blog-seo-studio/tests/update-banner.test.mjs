// 확장 새 버전 안내 검사: 서버 응답 → 사이드패널 배너 (브라우저·네트워크 없음)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const source = readFileSync(new URL("../extension/sidepanel.js", import.meta.url), "utf8");
const start = source.indexOf("const versionParts");
const end = source.indexOf("async function renderStatus()");
assert.ok(start > 0 && end > start, "새 버전 안내 코드를 찾지 못했습니다");

function makeContext(installed) {
  const nodes = {};
  const node = (id) => (nodes[id] ??= { hidden: true, textContent: "", href: "" });
  const context = {
    BASE: "https://naver-blog-seo-studio.vercel.app",
    $: node,
    chrome: { runtime: { getManifest: () => ({ version_name: installed, version: "1.0.0" }) } },
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, end), context);
  return { context, nodes };
}

const ok = (latestVersion, downloadUrl = `/downloads/naver-blog-seo-studio-extension-${latestVersion}.zip`) => ({ ok: true, latestVersion, downloadUrl });

test("최신 버전이 더 높으면 배너를 보여주고 ZIP 주소를 연결한다", () => {
  const { context, nodes } = makeContext("v1.59");
  context.renderUpdateBanner(ok("v1.60"));
  assert.equal(nodes.updateBanner.hidden, false);
  assert.match(nodes.updateBannerText.textContent, /v1\.59 → 최신 v1\.60/);
  assert.equal(nodes.updateBannerLink.href, "https://naver-blog-seo-studio.vercel.app/downloads/naver-blog-seo-studio-extension-v1.60.zip");
});

test("같거나 낮은 버전, 연결 실패, 다른 사이트 주소에서는 배너를 숨긴다", () => {
  for (const [installed, result] of [
    ["v1.60", ok("v1.60")],
    ["v1.60", ok("v1.59")],
    ["v1.59", { ok: false, error: "x" }],
    ["v1.59", ok("v1.60", "https://evil.example/x.zip")],
    ["v1.59", ok("v1.60", "/other/path.zip")],
    ["v1.59", ok("garbage")],
    ["v1.59", null],
  ]) {
    const { context, nodes } = makeContext(installed);
    nodes.updateBanner = { hidden: false };
    context.renderUpdateBanner(result);
    assert.equal(nodes.updateBanner.hidden, true, JSON.stringify([installed, result]));
  }
});

test("버전 비교는 숫자로 한다 (v1.10 > v1.9, v2.01 > v1.99)", () => {
  const { context } = makeContext("v1.0");
  assert.equal(context.isNewerVersion("v1.10", "v1.9"), true);
  assert.equal(context.isNewerVersion("v2.01", "v1.99"), true);
  assert.equal(context.isNewerVersion("v1.9", "v1.10"), false);
});
