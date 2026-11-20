import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTrustedOrigins, isPublicDnsName, DEV_HOSTS, TRUSTED_ORIGINS_MAX } from "../src/lib/mallPhotoApplyOrigins.ts";
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
  assert.deepEqual(buildTrustedOrigins(base({ rootDomain: " .Malls.Example. " })), []); // A2: 적힌 값이 정규형이 아니면 정리해 주지 않고 전체 차단(host.ts cleanRoot에 기대지 않음)
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
  assert.deepEqual(buildTrustedOrigins(base({ platformOrigins: null, rootDomain: "localhost" })), []); // 개발 모드가 아닌데 루트가 localhost = 잘못된 설정 → 전체 차단
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

// ---- A2 보완(Master msg_82ba2ea57877, Mac msg_eb8de2e7340d P2 반례): 비움과 잘못된 값 구분 · 루프백 정책 · 개발 외 우회 회귀 ----
test("A2 루트: 의도적으로 비운 루트(undefined·null·\"\")는 서브도메인만 없고 나머지는 그대로 — 개발 로컬도 허용", () => {
  for (const rootDomain of [undefined, null, ""]) {
    assert.deepEqual(buildTrustedOrigins(base({ rootDomain })), ["https://app.malls.example"], String(rootDomain));
    assert.deepEqual(buildTrustedOrigins(base({ rootDomain, dev: true, devOrigins: ["http://localhost:3210"] })), ["https://app.malls.example", "http://localhost:3210"]);
    assert.deepEqual(buildTrustedOrigins({ slug: "myshop", rootDomain, dev: true, devOrigins: ["http://127.0.0.1:3000"] }), ["http://127.0.0.1:3000"]);
  }
});

test("A2 루트: localhost는 개발 모드에서만 「서브도메인 없음」으로 허용, 개발 모드가 아니면 전체 차단", () => {
  assert.deepEqual(buildTrustedOrigins(base({ rootDomain: "localhost", dev: true, devOrigins: ["http://localhost:3210"] })), ["https://app.malls.example", "http://localhost:3210"]);
  assert.deepEqual(buildTrustedOrigins(base({ rootDomain: "localhost", dev: true })), ["https://app.malls.example"]);
  for (const dev of [false, undefined, null, "true", 1]) assert.deepEqual(buildTrustedOrigins(base({ rootDomain: "localhost", dev })), [], String(dev));
});

test("A2 루트: 적혀 있지만 잘못된 루트(빈 DNS 레이블·앞뒤 점·대문자·공백·포트·IP·한 단어 등)는 다른 값이 맞아도 전체 빈 목록", () => {
  const wrong = [];
  for (const rootDomain of [
    "malls..example", ".malls.example", "malls.example.", "..", ".", "a..b.c", "Malls.example", " malls.example", "malls.example ", "\tmalls.example",
    "malls", "malls.example:443", "https://malls.example", "malls.example/x", "-malls.example", "malls-.example", "malls.-example", "malls.example-",
    "mal_ls.example", "malls.e", "malls.123", "127.0.0.1", "10.0.0.1", "[::1]", "::1", "0.0.0.0", "foo.localhost", "LOCALHOST", "localhost.",
    "a".repeat(64) + ".example", ("a".repeat(60) + ".").repeat(5) + "example", "*.malls.example", "mälls.example", "malls.example\n",
  ]) {
    for (const dev of [false, true]) {
      if (buildTrustedOrigins(base({ rootDomain, dev, devOrigins: dev ? ["http://localhost:3210"] : null })).length !== 0) wrong.push(JSON.stringify([rootDomain, dev]));
    }
  }
  assert.deepEqual(wrong, []);
});

test("A2 루프백 정책: 플랫폼 출처에는 루프백·IP·localhost 계열·빈 레이블이 어떤 모양으로도 들어오지 못한다(개발 모드여도)", () => {
  const wrong = [];
  for (const v of [
    "https://localhost", "https://localhost:8443", "https://127.0.0.1", "https://127.0.0.2", "https://127.1", "https://2130706433", "https://0x7f000001",
    "https://0.0.0.0", "https://10.1.2.3", "https://192.168.0.5", "https://[::1]", "https://[::ffff:127.0.0.1]", "https://foo.localhost", "https://app.localhost:8443",
    "https://app..example", "https://.app.example", "https://app.example.", "https://-app.example", "https://app-.example", "https://app.example:0",
    "https://app", "https://app.e", "https://app.123", "http://app.malls.example", "https://xn--.example",
  ]) {
    for (const dev of [false, true]) {
      if (buildTrustedOrigins(base({ platformOrigins: [v], dev, devOrigins: dev ? ["http://localhost:3210"] : null })).length !== 0) wrong.push(JSON.stringify([v, dev]));
    }
  }
  assert.deepEqual(wrong, []);
  assert.deepEqual(buildTrustedOrigins(base({ platformOrigins: ["https://app.malls.example:8443"] })), ["https://app.malls.example:8443", "https://myshop.malls.example"]); // 공개 DNS 이름 + 포트는 허용
});

test("A2 루프백 정책: 커스텀 도메인에도 루프백·IP·localhost 계열·빈 레이블은 전체 차단", () => {
  const wrong = [];
  for (const customDomain of ["foo.localhost", "localhost", "127.0.0.2", "0.0.0.0", "[::1]", "::1", "shop..brand.test", ".shop.brand.test", "shop.brand.test.", "shop.brand.t",
    "shop.brand.123", "-shop.brand.test", "shop_x.brand.test", "SHOP.brand.test", "shop.brand.test:443"]) {
    for (const dev of [false, true]) if (buildTrustedOrigins(base({ customDomain, dev, devOrigins: dev ? ["http://localhost:3210"] : null })).length !== 0) wrong.push(JSON.stringify([customDomain, dev]));
  }
  assert.deepEqual(wrong, []);
});

test("A2 개발 출처: 정확히 http://localhost|127.0.0.1[:port]만 — 다른 루프백·변형은 개발 모드에서도 전체 차단", () => {
  assert.deepEqual([...DEV_HOSTS], ["localhost", "127.0.0.1"]);
  assert.deepEqual(buildTrustedOrigins(base({ dev: true, devOrigins: ["http://localhost", "http://127.0.0.1"] })),
    ["https://app.malls.example", "https://myshop.malls.example", "http://localhost", "http://127.0.0.1"]);
  const wrong = [];
  for (const v of ["http://127.0.0.2:3000", "http://127.1:3000", "http://[::1]:3000", "http://foo.localhost:3000", "http://localhost.:3000", "http://0.0.0.0:3000",
    "http://localhost:3000/", "http://localhost:80", "https://localhost:3000", "http://Localhost:3000", "http://localhost:3000?x", "ws://localhost:3000"]) {
    if (buildTrustedOrigins(base({ dev: true, devOrigins: [v] })).length !== 0) wrong.push(v);
  }
  assert.deepEqual(wrong, []);
});

test("A2 개발 외 우회 없음(합성 회귀): 개발 모드가 아니면 어떤 입력 조합에서도 http·루프백·IP 출처가 목록에 나오지 않는다", () => {
  const roots = [undefined, null, "", "malls.example", "localhost", "malls..example", "127.0.0.1"];
  const platforms = [undefined, null, [], ["https://app.malls.example"], ["https://localhost"], ["https://127.0.0.2"], ["http://localhost:3210"], ["https://[::1]"]];
  const customs = [undefined, null, "", "shop.brand.test", "foo.localhost", "127.0.0.1"];
  const devFlags = [false, undefined, null, "true", 1, "yes", {}, []];
  const devLists = [undefined, null, ["http://localhost:3210"], ["http://127.0.0.1:3000"], "http://localhost:3210"];
  const bad = [];
  let total = 0;
  for (const rootDomain of roots) for (const platformOrigins of platforms) for (const customDomain of customs) for (const dev of devFlags) for (const devOrigins of devLists) {
    total++;
    const list = buildTrustedOrigins({ slug: "myshop", rootDomain, platformOrigins, customDomain, dev, devOrigins });
    for (const o of list) {
      const u = new URL(o);
      if (u.protocol !== "https:" || !isPublicDnsName(u.hostname)) bad.push(JSON.stringify({ rootDomain, platformOrigins, customDomain, dev, devOrigins, o }));
    }
  }
  assert.ok(total > 10000);
  assert.deepEqual(bad.slice(0, 5), []);
});

test("A2 isPublicDnsName: 정규 DNS 이름만", () => {
  for (const ok of ["malls.example", "a.b.c.example", "xn--9n2bp8q.example", "a-b.example", "a".repeat(63) + ".example"]) assert.ok(isPublicDnsName(ok), ok);
  const wrong = [];
  for (const no of ["", "example", "a..b", ".a.b", "a.b.", "A.example", "a.example:1", "1.2.3.4", "a.123", "a.e", "a.localhost", "localhost", "[::1]", "a b.example",
    "-a.example", "a-.example", "a".repeat(64) + ".example", null, 5, {}]) if (isPublicDnsName(no)) wrong.push(String(no));
  assert.deepEqual(wrong, []);
});
