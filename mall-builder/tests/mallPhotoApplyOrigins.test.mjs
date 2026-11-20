import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTrustedOrigins, TRUSTED_ORIGINS_MAX } from "../src/lib/mallPhotoApplyOrigins.ts";
import { originAllowed } from "../src/lib/mallPhotoApplyRoute.ts";

// 메이커 M3 R1(2026-11-20, Master msg_235604de02db) — 신뢰 출처 목록 순수 함수. 합성 값만(실제 도메인·DB·환경변수·네트워크 0).
const ROOT = "malls.example";
const PLATFORM = ["https://app.malls.example"];
const base = (o = {}) => ({ slug: "myshop", rootDomain: ROOT, platformOrigins: PLATFORM, customDomain: null, dev: false, devOrigins: null, ...o });
const h = (o) => ({ get: (n) => o[n] ?? null });

test("플랫폼 출처 + 몰 서브도메인: 서버 값으로만 목록을 만든다", () => {
  assert.deepEqual(buildTrustedOrigins(base()), ["https://app.malls.example", "https://myshop.malls.example"]);
  assert.deepEqual(buildTrustedOrigins(base({ platformOrigins: null })), ["https://myshop.malls.example"]);
  assert.deepEqual(buildTrustedOrigins(base({ rootDomain: null })), ["https://app.malls.example"]);
  assert.deepEqual(buildTrustedOrigins(base({ rootDomain: " .Malls.Example. " })), ["https://app.malls.example", "https://myshop.malls.example"]); // host.ts 정리 규칙 그대로
  assert.deepEqual(buildTrustedOrigins(base({ platformOrigins: ["https://app.malls.example", "https://app.malls.example", "https://b.example:8443"] })),
    ["https://app.malls.example", "https://b.example:8443", "https://myshop.malls.example"]); // 중복 제거
});

test("몰 서브도메인은 그 몰 것만 — 다른 몰 서브도메인·루트 도메인 자체는 목록에 없다", () => {
  const list = buildTrustedOrigins(base({ platformOrigins: null }));
  assert.ok(originAllowed(h({ origin: "https://myshop.malls.example" }), list));
  for (const origin of ["https://other.malls.example", "https://malls.example", "https://a.myshop.malls.example", "https://myshop.malls.example.evil.test", "http://myshop.malls.example"])
    assert.ok(!originAllowed(h({ origin }), list), origin);
});

test("확인된 커스텀 도메인: DB 값이 규칙을 통과한 이름일 때만 https 출처로 추가", () => {
  const list = buildTrustedOrigins(base({ customDomain: "shop.brand-site.test" }));
  assert.deepEqual(list, ["https://app.malls.example", "https://myshop.malls.example", "https://shop.brand-site.test"]);
  assert.ok(originAllowed(h({ origin: "https://shop.brand-site.test" }), list));
  assert.ok(!originAllowed(h({ origin: "https://www.shop.brand-site.test" }), list));
  assert.ok(!originAllowed(h({ origin: "https://other-brand.test" }), list)); // 등록되지 않은 도메인
  assert.deepEqual(buildTrustedOrigins(base({ customDomain: "" })), buildTrustedOrigins(base()));
});

test("커스텀 도메인 값이 잘못됐으면 전부 차단(빈 목록) — 조용히 빼고 허용하지 않는다", () => {
  const wrong = [];
  for (const customDomain of [
    "Shop.Brand-Site.test", "shop.brand-site.test:8443", "shop.brand-site.test.", "https://shop.brand-site.test", "shop.brand-site.test/path",
    "localhost", "127.0.0.1", "10.0.0.5", "nodots", "x.malls.example", "malls.example", "something.vercel.app", "a.buylife.xyz",
    " shop.brand-site.test", "shop brand.test", "*.brand-site.test", "shop.brand-site.test?x=1", "user@shop.brand-site.test", 5, {}, [],
  ]) if (buildTrustedOrigins(base({ customDomain })).length !== 0) wrong.push(String(customDomain));
  assert.deepEqual(wrong, []);
});

test("localhost는 개발 모드에서만 — 개발 모드가 아니면 값이 와도 목록에 없다", () => {
  const dev = buildTrustedOrigins(base({ dev: true, devOrigins: ["http://localhost:3210", "http://127.0.0.1:3000"] }));
  assert.deepEqual(dev, ["https://app.malls.example", "https://myshop.malls.example", "http://localhost:3210", "http://127.0.0.1:3000"]);
  assert.ok(originAllowed(h({ origin: "http://localhost:3210" }), dev));
  assert.ok(!originAllowed(h({ origin: "http://localhost:9999" }), dev)); // 명시한 포트만
  for (const flag of [false, undefined, null, "true", 1]) {
    const prod = buildTrustedOrigins(base({ dev: flag, devOrigins: ["http://localhost:3210"] }));
    assert.deepEqual(prod, ["https://app.malls.example", "https://myshop.malls.example"], String(flag));
    assert.ok(!originAllowed(h({ origin: "http://localhost:3210" }), prod));
  }
  assert.deepEqual(buildTrustedOrigins(base({ dev: true })), ["https://app.malls.example", "https://myshop.malls.example"]); // 개발 모드여도 명시가 없으면 없음
});

test("개발 출처 값이 잘못됐으면(개발 모드) 전부 차단 — https·다른 호스트·경로·대문자·목록 아님", () => {
  const wrong = [];
  for (const devOrigins of [["https://localhost:3210"], ["http://dev.example:3000"], ["http://localhost:3210/"], ["http://LOCALHOST:3210"],
    ["http://localhost:3210", "http://192.168.0.5:3000"], ["http://0.0.0.0:3000"], ["localhost:3210"], [""], [5], "http://localhost:3210", {}])
    if (buildTrustedOrigins(base({ dev: true, devOrigins })).length !== 0) wrong.push(JSON.stringify(devOrigins));
  assert.deepEqual(wrong, []);
});

test("플랫폼 출처·몰 이름·루트 도메인이 잘못됐으면 전부 차단", () => {
  const wrong = [];
  const cases = [
    { platformOrigins: ["http://app.malls.example"] }, { platformOrigins: ["https://app.malls.example/"] }, { platformOrigins: ["https://App.malls.example"] },
    { platformOrigins: ["https://app.malls.example:443"] }, { platformOrigins: ["https://app.malls.example", "*"] }, { platformOrigins: ["https://user@app.malls.example"] },
    { platformOrigins: ["https://app.malls.example?x=1"] }, { platformOrigins: ["http://localhost:3210"] }, { platformOrigins: ["https://localhost"] },
    { platformOrigins: ["app.malls.example"] }, { platformOrigins: [""] }, { platformOrigins: [null] }, { platformOrigins: "https://app.malls.example" },
    { platformOrigins: Array.from({ length: TRUSTED_ORIGINS_MAX + 1 }, (_, i) => `https://p${i}.example`) },
    { slug: "" }, { slug: "MyShop" }, { slug: " myshop" }, { slug: "ab" }, { slug: "admin" }, { slug: "my.shop" }, { slug: "my/shop" }, { slug: 5 }, { slug: null },
    { rootDomain: 5 }, { rootDomain: {} },
  ];
  for (const c of cases) if (buildTrustedOrigins(base(c)).length !== 0) wrong.push(JSON.stringify(c).slice(0, 90));
  assert.deepEqual(wrong, []);
  assert.deepEqual(buildTrustedOrigins(null), []); assert.deepEqual(buildTrustedOrigins(undefined), []); assert.deepEqual(buildTrustedOrigins("x"), []);
});

test("서버 값이 하나도 없으면 빈 목록 = originAllowed가 전부 차단", () => {
  const none = buildTrustedOrigins({ slug: "myshop" });
  assert.deepEqual(none, []);
  assert.ok(!originAllowed(h({ origin: "https://myshop.malls.example" }), none));
  assert.deepEqual(buildTrustedOrigins(base({ platformOrigins: null, rootDomain: "localhost" })), []); // 루트가 localhost면 서브도메인 출처 없음
});

test("요청 머리글은 입력이 아니다 — Host·X-Forwarded-Host를 꾸며도 목록·판정이 바뀌지 않는다", () => {
  const list = buildTrustedOrigins(base());
  const forged = h({ origin: "https://evil.test", host: "evil.test", "x-forwarded-host": "evil.test", "x-forwarded-proto": "https" });
  assert.ok(!originAllowed(forged, list));
  const withExtra = buildTrustedOrigins({ ...base(), host: "evil.test", origin: "https://evil.test", headers: { host: "evil.test" } }); // 모르는 칸은 무시
  assert.deepEqual(withExtra, list);
  const src = readFileSync(new URL("../src/lib/mallPhotoApplyOrigins.ts", import.meta.url), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/headers|x-forwarded|\.get\(|process\.env|Request\b/i.test(src)); // 머리글·환경변수를 직접 읽지 않는다(호출 쪽이 서버 값으로 넘김)
  assert.ok(!/console\.|["']use client["']/.test(src));
});

test("반환 목록의 모든 값은 originAllowed가 받아들이는 정규형이다(목록 전체가 유효 설정)", () => {
  const list = buildTrustedOrigins(base({ customDomain: "shop.brand-site.test", dev: true, devOrigins: ["http://localhost:3210"] }));
  for (const origin of list) assert.ok(originAllowed(h({ origin }), list), origin);
  assert.ok(originAllowed(h({ origin: list[0], "sec-fetch-site": "same-origin" }), list));
  assert.ok(!originAllowed(h({ origin: list[0], "sec-fetch-site": "cross-site" }), list));
});
