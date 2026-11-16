// 2026-11-16 threads-auto(MIT, bd2fec7) 이식 1단계 시험 — 쿠팡 골드박스·카테고리 베스트·쿠팡 PL 조회, 후보 합치기·거르기·정렬,
// 키워드 나누기, 등록 상품 번호 꺼내기. 외부 호출은 가짜(fetch)로 바꾼다. 원본은 시험 코드를 공개하지 않아 새로 썼다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.join(__dirname, "../src/lib");
function load(rel, { fetch } = {}) {
  const source = fs.readFileSync(path.join(root, rel), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const req = (id) => (id === "server-only" ? {} : require(id));
  vm.runInNewContext(compiled, { module, exports: module.exports, require: req, fetch, URL, URLSearchParams, AbortSignal, Buffer, console }, { filename: rel });
  return module.exports;
}
const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) });
const raw = (id, extra = {}) => ({ productId: id, productName: `상품${id}`, productImage: `https://img/${id}.jpg`, productPrice: 1000 * id, productUrl: `https://link.coupang.com/re/AFFSDP?pageKey=${id}`, ...extra });

test("골드박스·카테고리 베스트·PL: 주소·서명·배열 응답 해석, 필수값 없는 상품은 버림", async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    return ok({ rCode: "0", data: [raw(1, { isRocket: true, isRocketFresh: true, categoryName: "식품" }), { productId: 2, productName: "" }] });
  };
  const api = load("affiliate-clients/coupangApi.ts", { fetch });
  const auth = { accessKey: "AK", secretKey: "SK" };
  const gold = await api.getCoupangGoldbox(auth);
  await api.getCoupangBestCategory("1012", auth);
  await api.getCoupangPl("1006", auth);
  await api.getCoupangPl(undefined, auth);
  assert.match(calls[0].url, /\/products\/goldbox$/);
  assert.match(calls[1].url, /\/products\/bestcategories\/1012\?limit=100$/);
  assert.match(calls[2].url, /\/products\/coupangPL\/1006\?limit=100$/);
  assert.match(calls[3].url, /\/products\/coupangPL\?limit=100$/);
  assert.match(calls[1].init.headers.Authorization, /^CEA algorithm=HmacSHA256, access-key=AK/);
  assert.equal(gold.length, 1);
  assert.deepEqual({ ...gold[0] }, { productId: 1, productName: "상품1", productImage: "https://img/1.jpg", productPrice: 1000, productUrl: "https://link.coupang.com/re/AFFSDP?pageKey=1", isRocket: true, isFreeShipping: false, isRocketFresh: true, categoryName: "식품" });
  await assert.rejects(api.getCoupangBestCategory("10;x", auth), /카테고리 번호/);
  await assert.rejects(api.getCoupangPl("abc", auth), /브랜드 번호/);
});

test("응답 오류 코드와 429 안내", async () => {
  let n = 0;
  const fetch = async () => (++n === 1 ? ok({ rCode: "400", rMessage: "bad" }) : { ok: false, status: 429, text: async () => "" });
  const api = load("affiliate-clients/coupangApi.ts", { fetch });
  await assert.rejects(api.getCoupangGoldbox({ accessKey: "a", secretKey: "b" }), /골드박스 조회 응답 오류: bad/);
  await assert.rejects(api.getCoupangGoldbox({ accessKey: "a", secretKey: "b" }), /호출 한도/);
});

test("후보 합치기: 같은 상품은 하나로·경로 표시 합침, 등록 상품 제외, 로켓 조건, 점수 정렬", () => {
  const sel = load("coupang/productSelection.ts");
  const p = (id, extra = {}) => ({ productId: id, productName: `상품${id}`, productImage: "i", productPrice: 1, productUrl: "u", isRocket: false, isFreeShipping: false, ...extra });
  const search = sel.toCoupangCandidates([p(1), p(2, { isRocket: true }), p(3, { productName: "무선 이어폰" })], "SEARCH");
  const gold = sel.toCoupangCandidates([p(1), p(4, { isRocketFresh: true })], "GOLDBOX");
  const merged = sel.selectCoupangProductCandidates([...search, ...gold], { keywords: ["이어폰"], rocketOnly: false, rocketFreshOnly: false });
  assert.deepEqual(Array.from(merged, (c) => c.sourceKey), ["4", "1", "2", "3"]); // 골드박스+프레시 7, 골드박스 4, 로켓 2, 키워드 1
  const one = merged.find((c) => c.sourceKey === "1");
  assert.deepEqual([...one.sourceKinds], ["SEARCH", "GOLDBOX"]);
  assert.equal(one.isGoldBox, true);

  const excluded = sel.selectCoupangProductCandidates([...search, ...gold], { keywords: [], rocketOnly: false, rocketFreshOnly: false, excludedSourceKeys: new Set(["1", "4"]) });
  assert.deepEqual(Array.from(excluded, (c) => c.sourceKey).sort(), ["2", "3"]);

  const rocket = sel.selectCoupangProductCandidates([...search, ...gold], { keywords: [], rocketOnly: true, rocketFreshOnly: false });
  assert.deepEqual(Array.from(rocket, (c) => c.sourceKey), ["2"]);
  const fresh = sel.selectCoupangProductCandidates([...search, ...gold], { keywords: [], rocketOnly: false, rocketFreshOnly: true });
  assert.deepEqual(Array.from(fresh, (c) => c.sourceKey).sort(), ["2", "4"]);

  const many = sel.toCoupangCandidates(Array.from({ length: 150 }, (_, i) => p(i + 1)), "CATEGORY_BEST");
  assert.equal(sel.selectCoupangProductCandidates(many, { keywords: [], rocketOnly: false, rocketFreshOnly: false }).length, 100);
});

test("등록 상품 번호 꺼내기: source_key 우선, 추적 링크 pageKey, 상품 주소, 단축 링크는 없음", () => {
  const { coupangSourceKeyOf } = load("coupang/productSelection.ts");
  assert.equal(coupangSourceKeyOf({ source_key: "77", product_url: "https://link.coupang.com/re/AFFSDP?pageKey=1" }), "77");
  assert.equal(coupangSourceKeyOf({ source_key: null, product_url: "https://link.coupang.com/re/AFFSDP?lptag=AF1&pageKey=123&itemId=9" }), "123");
  assert.equal(coupangSourceKeyOf({ product_url: "https://www.coupang.com/vp/products/456?itemId=1" }), "456");
  assert.equal(coupangSourceKeyOf({ product_url: "https://link.coupang.com/a/bXyZ" }), null);
  assert.equal(coupangSourceKeyOf({ source_key: "-12", product_url: "x" }), null);
});

test("키워드 나누기와 설정 값 좁히기", () => {
  const cat = load("coupang/catalog.ts");
  assert.deepEqual([...cat.splitCoupangKeywords(" 이어폰, 의자\n이어폰,, 텐트 ")], ["이어폰", "의자", "텐트"]);
  assert.equal(cat.splitCoupangKeywords(Array.from({ length: 15 }, (_, i) => `k${i}`).join(",")).length, 10);
  const s = cat.normalizeCoupangProductSearchSettings({ categoryId: "9999", coupangPlBrandId: "1006", goldBoxIncluded: true });
  assert.equal(s.categoryId, "ALL");
  assert.equal(s.coupangPlBrandId, "1006");
  assert.equal(s.keywordSearchIncluded, true);
  assert.equal(cat.hasCoupangProductSource({ ...s, keywordSearchIncluded: false, goldBoxIncluded: false }), false);
});
