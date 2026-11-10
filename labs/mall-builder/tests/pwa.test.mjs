import { test } from "node:test";
import assert from "node:assert/strict";
import { appLogoOf, buildManifest, iconColor, iconInitial, shortName, shouldOfferInstall } from "../src/lib/pwa.ts";

test("로고 주소는 https만", () => {
  assert.equal(appLogoOf({ app_logo: "https://x.supabase.co/a.png" }), "https://x.supabase.co/a.png");
  assert.equal(appLogoOf({ app_logo: "http://x/a.png" }), "");
  assert.equal(appLogoOf({ app_logo: "javascript:alert(1)" }), "");
  assert.equal(appLogoOf(null), "");
});

test("첫 글자·색·짧은 이름", () => {
  assert.equal(iconInitial("aimaster B2B"), "A");
  assert.equal(iconInitial("  [바이라이프] 도매"), "바");
  assert.equal(iconInitial(""), "M");
  assert.equal(iconColor("가나몰"), iconColor("가나몰"));
  assert.match(iconColor("가나몰"), /^#[0-9a-f]{6}$/);
  assert.equal(shortName("바이라이프 사무용품 도매 전문몰"), "바이라이프 사무용품 도");
});

test("앱 설명 파일: 하위 도메인이면 시작 주소 /", () => {
  const a = buildManifest({ name: "가나몰", slug: "gana", onSubdomain: false, version: "1" });
  assert.equal(a.start_url, "/s/gana/");
  assert.equal(a.scope, "/s/gana/");
  assert.equal(a.display, "standalone");
  assert.deepEqual(a.icons.map((i) => i.sizes), ["192x192", "512x512"]);
  assert.equal(a.icons[0].src, "/s/gana/app-icon/192?v=1");
  const b = buildManifest({ name: "가나몰", slug: "gana", onSubdomain: true, version: "1" });
  assert.equal(b.start_url, "/");
  assert.equal(b.icons[1].src, "/s/gana/app-icon/512?v=1");
});

test("설치 안내는 승인된 사업자 손님만", () => {
  assert.equal(shouldOfferInstall(null), false);
  assert.equal(shouldOfferInstall({ kind: "consumer", approval_status: "approved" }), false);
  assert.equal(shouldOfferInstall({ kind: "business", approval_status: "pending" }), false);
  assert.equal(shouldOfferInstall({ kind: "business", approval_status: "approved" }), true);
});
