// T0 운영 관문 — 로그인 없이 열어 두는 경로만 열려 있는지
import { test } from "node:test";
import assert from "node:assert/strict";
import { isOpenPath } from "../src/lib/platform.ts";

test("열어 두는 경로", () => {
  for (const p of ["/api/cron/deposit-expire", "/login", "/sw.js", "/robots.txt", "/ai.txt", "/s/aimaster-b2b/manifest.webmanifest", "/s/aimaster-b2b/app-icon/192", "/s/aimaster-b2b/app-icon"]) assert.equal(isOpenPath(p), true, p);
});

test("막는 경로(로그인·이용 권한 필요)", () => {
  for (const p of ["/", "/s/aimaster-b2b", "/s/aimaster-b2b/admin", "/s/aimaster-b2b/admin/grades", "/s/aimaster-b2b/p/123", "/invite/abc", "/api/other", "/s/aimaster-b2b/manifest.webmanifest/x", "/loginx", "/s/a/b/app-icon/1"]) assert.equal(isOpenPath(p), false, p);
});
