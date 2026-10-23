// 확장 새 버전 안내 검사: whoami 응답 → 사이드패널 배너 (브라우저·네트워크·DB 없음)
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const DOWNLOAD = "https://www.buylife.xyz/downloads/naver-blog-auto-poster-web-extension-latest.zip";

const panel = read("../extension/sidepanel.js");
const start = panel.indexOf("const UPDATE_LINK_PREFIX");
const end = panel.indexOf("function renderStatus(result)");
assert.ok(start > 0 && end > start, "새 버전 안내 코드를 찾지 못했습니다");

function makeBanner(installed) {
  const nodes = {};
  const context = {
    document: { getElementById: (id) => (nodes[id] ??= { hidden: true, textContent: "", href: "" }) },
    chrome: { runtime: { getManifest: () => ({ version_name: installed, version: "1.0.0" }) } },
  };
  vm.createContext(context);
  vm.runInContext(panel.slice(start, end), context);
  return { context, nodes };
}
const linked = (latestVersion, downloadUrl = DOWNLOAD) => ({ linked: true, latestVersion, downloadUrl });

test("서버 최신 버전이 더 높으면 배너와 사이트 ZIP 링크를 보여준다", () => {
  const { context, nodes } = makeBanner("v1.01");
  context.renderUpdateBanner(linked("v1.02"));
  assert.equal(nodes["update-banner"].hidden, false);
  assert.match(nodes["update-banner-text"].textContent, /v1\.01 → 최신 v1\.02/);
  assert.equal(nodes["update-banner-link"].href, DOWNLOAD);
});

test("같거나 낮은 버전, 연동 실패, 우리 사이트가 아닌 주소에서는 숨긴다", () => {
  for (const [installed, result] of [
    ["v1.02", linked("v1.02")],
    ["v1.02", linked("v1.01")],
    ["v1.01", { linked: false, error: "x" }],
    ["v1.01", linked("v1.02", "https://evil.example/x.zip")],
    ["v1.01", linked("v1.02", "https://github.com/BUYLIFEMALL/aimaster/releases/download/x/y.zip")],
    ["v1.01", linked("garbage")],
    ["v1.01", linked(undefined)],
  ]) {
    const { context, nodes } = makeBanner(installed);
    nodes["update-banner"] = { hidden: false };
    context.renderUpdateBanner(result);
    assert.equal(nodes["update-banner"].hidden, true, JSON.stringify([installed, result]));
  }
});

test("whoami가 최신 버전과 다운로드 주소를 돌려주고 확장 manifest와 같은 버전이다", async () => {
  const versionModule = { exports: {} };
  const versionJs = ts.transpileModule(read("../../lib/naverBlogAutoPosterWebExtension.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function("module", "exports", versionJs)(versionModule, versionModule.exports);
  const { POSTER_WEB_EXTENSION_VERSION, POSTER_WEB_EXTENSION_DOWNLOAD_URL } = versionModule.exports;

  const route = { exports: {} };
  const routeJs = ts.transpileModule(read("../../app/api/naver-blog-auto-poster-web/whoami/route.ts"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const requireStub = (id) => {
    if (id === "next/server") return { NextResponse: { json: (body, init) => ({ body, status: init?.status ?? 200 }) } };
    if (id === "@/lib/personalAccessTokenAuth") return { verifyPersonalAccessTokenWithProgramAccess: async () => ({ token: { email: "a@b.c", name: "A", isAdmin: false } }) };
    if (id === "@/lib/naverBlogAutoPosterWebExtension") return versionModule.exports;
    throw new Error(`Unexpected import ${id}`);
  };
  new Function("module", "exports", "require", routeJs)(route, route.exports, requireStub);
  const res = await route.exports.GET({});
  assert.equal(res.status, 200);
  assert.equal(res.body.latestVersion, POSTER_WEB_EXTENSION_VERSION);
  assert.equal(res.body.downloadUrl, POSTER_WEB_EXTENSION_DOWNLOAD_URL);
  assert.equal(res.body.downloadUrl, DOWNLOAD);

  const manifest = JSON.parse(read("../extension/manifest.json"));
  assert.equal(manifest.version_name, POSTER_WEB_EXTENSION_VERSION, "확장 manifest version_name과 서버가 알리는 최신 버전이 같아야 한다");
  assert.equal(manifest.version, "1.3.0");
});
