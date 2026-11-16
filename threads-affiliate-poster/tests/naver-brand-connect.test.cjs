// 2026-11-16 threads-auto(MIT) 이식 2단계 시험 — naver.me 링크 검사·여러 줄 나누기·도착 주소(쇼핑/여행) 판별·이미지 주소 검사·
// 확장 결과 서버 재검사·근거 문구. 원본은 시험 코드를 공개하지 않아 새로 썼다. 외부 호출 없음.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/naver/brandConnect.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
vm.runInNewContext(compiled, { module: mod, exports: mod.exports, URL });
const nb = mod.exports;
const plain = (v) => JSON.parse(JSON.stringify(v));

test("naver.me 링크 검사와 여러 줄 나누기", () => {
  assert.equal(nb.isNaverBrandAffiliateUrl("https://naver.me/AbC123"), true);
  assert.equal(nb.isNaverBrandAffiliateUrl("http://naver.me/AbC123"), false);
  assert.equal(nb.isNaverBrandAffiliateUrl("https://naver.me/"), false);
  assert.equal(nb.isNaverBrandAffiliateUrl("https://user@naver.me/x"), false);
  assert.equal(nb.isNaverBrandAffiliateUrl("https://evil.com/naver.me/x"), false);
  const r = plain(nb.parseNaverBrandLinks(" https://naver.me/a1\n\nhttps://naver.me/a1\nhttps://smartstore.naver.com/x\nhttps://naver.me/b2 "));
  assert.deepEqual(r, { links: ["https://naver.me/a1", "https://naver.me/b2"], rejected: ["https://smartstore.naver.com/x"] });
});

test("도착 주소로 쇼핑/여행 판별, 허용 밖은 null", () => {
  assert.deepEqual(plain(nb.naverProductIdentity("https://smartstore.naver.com/shop/products/12345?x=1")), { kind: "SHOPPING", productKey: "smartstore.naver.com:12345" });
  assert.deepEqual(plain(nb.naverProductIdentity("https://brand.naver.com/b/products/987")), { kind: "SHOPPING", productKey: "brand.naver.com:987" });
  assert.deepEqual(plain(nb.naverProductIdentity("https://pkgtour.naver.com/products/AB12/cd-34")), { kind: "TRAVEL", productKey: "pkgtour.naver.com:AB12:cd-34" });
  assert.equal(nb.naverProductIdentity("https://nid.naver.com/nidlogin.login"), null);
  assert.equal(nb.naverProductIdentity("https://smartstore.naver.com/shop"), null);
  assert.equal(nb.naverProductIdentity("http://smartstore.naver.com/shop/products/1"), null);
});

test("이미지 주소는 pstatic.net만 https로", () => {
  assert.equal(nb.normalizeNaverImage("http://shop-phinf.pstatic.net/a.jpg#x"), "https://shop-phinf.pstatic.net/a.jpg");
  assert.equal(nb.normalizeNaverImage("https://evil.com/a.jpg"), null);
  assert.equal(nb.normalizeNaverImage("javascript:alert(1)"), null);
});

test("확장 결과 서버 재검사: 정리·제한, 상품 페이지 아니면 오류", () => {
  const ok = plain(nb.sanitizeCollected({
    finalUrl: "https://smartstore.naver.com/s/products/11",
    title: "  좋은   텀블러 ",
    imageUrls: ["https://shop-phinf.pstatic.net/1.jpg", "https://shop-phinf.pstatic.net/1.jpg", "https://evil.com/2.jpg"],
    reviews: [{ text: "평점 5 정말 좋아요 보온이 오래가요", rating: 5 }, { text: "짧음" }, { text: "평점 9 이상한 평점 리뷰입니다요", rating: 9 }],
    facts: ["브랜드: 가나", ""],
  }));
  assert.equal(ok.kind, "SHOPPING");
  assert.equal(ok.productName, "좋은 텀블러");
  assert.deepEqual(ok.imageUrls, ["https://shop-phinf.pstatic.net/1.jpg"]);
  assert.equal(ok.reviews.length, 2);
  assert.equal(ok.reviews[1].rating, undefined);
  assert.deepEqual(ok.facts, ["브랜드: 가나"]);
  assert.match(plain(nb.sanitizeCollected({ finalUrl: "https://nid.naver.com/login", title: "x", imageUrls: ["https://a.pstatic.net/1.jpg"] })).error, /상품 페이지가 아닙니다/);
  assert.match(plain(nb.sanitizeCollected({ finalUrl: "https://smartstore.naver.com/s/products/11", title: "x", imageUrls: [] })).error, /이미지/);
});

test("고지 문구 쇼핑/여행과 근거 문구의 지어내기 금지 안내", () => {
  assert.match(nb.NAVER_SHOPPING_DISCLOSURE, /쇼핑 커넥트 활동의 일환/);
  assert.match(nb.NAVER_TRAVEL_DISCLOSURE, /여행 커넥트 활동의 일환/);
  const t = nb.evidenceText({ facts: ["브랜드: 가나"], reviews: [{ text: "좋아요 오래가요", rating: 5 }] });
  assert.match(t, /상품 페이지 정보: 브랜드: 가나/);
  assert.match(t, /\[평점 5\] 좋아요/);
  assert.match(t, /지어내지 말고/);
});

// WS-20261117-02: 도착 주소 판정 — 계정 정보·비표준 포트 거부를 서버(naverProductIdentity)와 확장(productIdentity)이 똑같이 한다.
// https 기본 포트를 적은 :443은 URL 정규화로 포트가 비므로 허용(정상 주소와 같음).
const extSource = fs.readFileSync(path.join(__dirname, "../extension/background.js"), "utf8");
const extCtx = { URL, setTimeout, chrome: { runtime: { onMessage: { addListener() {} }, getManifest: () => ({}) } } };
vm.runInNewContext(`${extSource}\n;globalThis.__productIdentity = productIdentity;`, extCtx);
const extIdentity = extCtx.__productIdentity;

test("도착 주소: 계정 정보·비표준 포트는 서버·확장 모두 거부, 정상 쇼핑·여행과 :443은 허용", () => {
  const rejected = [
    "https://u:p@smartstore.naver.com/s/products/1",
    "https://u@brand.naver.com/b/products/2",
    "https://smartstore.naver.com:8443/s/products/1",
    "https://shopping.naver.com:80/products/3",
    "https://user@pkgtour.naver.com/products/AB12/cd-34",
    "https://pkgtour.naver.com:8080/products/AB12/cd-34",
    "https://smartstore.naver.com.evil.com/s/products/1",
    "https://evil.com/products/1",
  ];
  for (const u of rejected) {
    assert.equal(nb.naverProductIdentity(u), null, `서버 거부: ${u}`);
    assert.equal(extIdentity(u), false, `확장 거부: ${u}`);
  }
  const allowed = [
    ["https://smartstore.naver.com/s/products/1", { kind: "SHOPPING", productKey: "smartstore.naver.com:1" }],
    ["https://smartstore.naver.com:443/s/products/1", { kind: "SHOPPING", productKey: "smartstore.naver.com:1" }],
    ["https://brand.naver.com/b/products/987", { kind: "SHOPPING", productKey: "brand.naver.com:987" }],
    ["https://shopping.naver.com/window-products/products/5", { kind: "SHOPPING", productKey: "shopping.naver.com:5" }],
    ["https://pkgtour.naver.com/products/AB12/cd-34", { kind: "TRAVEL", productKey: "pkgtour.naver.com:AB12:cd-34" }],
  ];
  for (const [u, want] of allowed) {
    assert.deepEqual(plain(nb.naverProductIdentity(u)), want, `서버 허용: ${u}`);
    assert.equal(extIdentity(u), true, `확장 허용: ${u}`);
  }
});
