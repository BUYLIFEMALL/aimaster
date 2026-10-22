// 2026-10-23 공용 기준 코드 「affiliate-clients」 시험 — 쿠팡·알리·토스 연동의 서명·요청 모양·응답 해석·오류 안내.
// 외부 호출(fetch·undici)은 가짜로 바꾼다. 실제 쿠팡·알리·토스 호출과 회원 키는 쓰지 않는다.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const ts = require("typescript");

const dir = path.join(__dirname, "../src/lib/affiliate-clients");
function load(file, { fetch, mocks = {}, env = {} } = {}) {
  const source = fs.readFileSync(path.join(dir, file), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const module = { exports: {} };
  const req = (id) => (id === "server-only" ? {} : id in mocks ? mocks[id] : require(id));
  vm.runInNewContext(compiled, { module, exports: module.exports, require: req, fetch, URL, URLSearchParams, AbortSignal, Buffer, setTimeout, console, process: { env } }, { filename: file });
  return module.exports;
}
const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body) });

test("쿠팡 서명: signedDate+method+path+query(사이에 ? 없음)를 HMAC-SHA256", () => {
  const { buildCoupangAuthorization } = load("coupangApi.ts");
  const now = new Date(Date.UTC(2026, 9, 23, 1, 2, 3));
  const header = buildCoupangAuthorization("GET", "/p", "keyword=a", { accessKey: "AK", secretKey: "SK" }, now);
  const expected = crypto.createHmac("sha256", "SK").update("261023T010203ZGET/pkeyword=a").digest("hex");
  assert.equal(header, `CEA algorithm=HmacSHA256, access-key=AK, signed-date=261023T010203Z, signature=${expected}`);
});

test("쿠팡 검색: 주소·서명 머리글·결과 정리, 키 미활성 401 안내", async () => {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    if (calls.length === 2) return { ok: false, status: 401, text: async () => "Specified key is not registered." };
    return json({ rCode: "0", data: { productData: [{ productId: 1, productName: "찜기", productImage: "i", productPrice: 9900, productUrl: "u", isRocket: 1 }] } });
  };
  const api = load("coupangApi.ts", { fetch });
  const [p] = await api.searchCoupangProducts("찜기", { accessKey: "AK", secretKey: "SK", limit: 6 });
  assert.match(calls[0].url, /products\/search\?keyword=%EC%B0%9C%EA%B8%B0&limit=6$/);
  assert.match(calls[0].init.headers.Authorization, /^CEA algorithm=HmacSHA256, access-key=AK/);
  assert.deepEqual({ ...p }, { productId: 1, productName: "찜기", productImage: "i", productPrice: 9900, productUrl: "u", isRocket: true, isFreeShipping: false });
  await assert.rejects(api.searchCoupangProducts("x", { accessKey: "AK", secretKey: "SK" }), /누적 매출이 15만원/);
});

test("쿠팡 상세 주소·단축 링크 판정", () => {
  const api = load("coupangApi.ts");
  assert.equal(api.buildProductDetailUrl({ productId: 12, productUrl: "https://link.coupang.com/re/AFFSDP?itemId=3&vendorItemId=4" }), "https://www.coupang.com/vp/products/12?itemId=3&vendorItemId=4");
  assert.equal(api.buildProductDetailUrl({ productId: "x" }), "");
  assert.equal(api.isCoupangShortUrl("https://link.coupang.com/a/abc"), true);
  assert.equal(api.isCoupangShortUrl("https://link.coupang.com/re/AFFSDP?x=1"), false);
});

test("쿠팡 링크 판정·위젯 주소 해석", () => {
  const links = load("coupangLinks.ts");
  assert.equal(links.checkCoupangAffiliateLink("https://link.coupang.com/a/x").ok, true);
  assert.equal(links.checkCoupangAffiliateLink("https://www.coupang.com/vp/products/1").reason, "plain_store_url");
  assert.equal(links.checkCoupangAffiliateLink("https://www.coupang.com/vp/products/1?lptag=AF123").ok, true);
  assert.equal(links.checkCoupangAffiliateLink("https://coupa.ng/abc").reason, "widget_url");
  assert.equal(links.extractCoupaNgUrl('<iframe src="https://coupa.ng/cXyZ"></iframe>'), "https://coupa.ng/cXyZ");
  const parsed = links.parseCoupangWidgetRedirect("https://ads-partners.coupang.com/iframe/product?link=https%3A%2F%2Flink.coupang.com%2Fa%2Fq&title=%EC%B0%9C%EA%B8%B0&image=retail/a.jpg");
  assert.deepEqual({ ...parsed }, { url: "https://link.coupang.com/a/q", name: "찜기", imageUrl: "https://thumbnail7.coupangcdn.com/thumbnails/remote/492x492ex/image/retail/a.jpg" });
});

test("알리: MD5 서명·제휴 링크·상품 상세 사진 정리", async () => {
  const bodies = [];
  const fetch = async (_url, init) => {
    const params = Object.fromEntries(new URLSearchParams(init.body));
    bodies.push(params);
    if (params.method === "aliexpress.affiliate.link.generate") {
      return json({ aliexpress_affiliate_link_generate_response: { resp_result: { result: { promotion_links: { promotion_link: [{ promotion_link: "https://s.click.aliexpress.com/e/_x", source_value: "src" }] } } } } });
    }
    return json({ aliexpress_affiliate_productdetail_get_response: { resp_result: { result: { products: { product: [{ product_id: 1005, product_main_image_url: "//ae01.alicdn.com/a.jpg" }] } } } } });
  };
  const ali = load("aliexpress.ts", { fetch });
  const auth = { appKey: "K", appSecret: "S", trackingId: "T" };
  assert.equal(await ali.createAliexpressPromotionLink("https://ko.aliexpress.com/item/1005.html", auth), "https://s.click.aliexpress.com/e/_x");
  const { sign, ...rest } = bodies[0];
  assert.equal(sign, ali.signAliexpressParams(rest, "S"));
  assert.equal(rest.tracking_id, "T");
  assert.equal(await ali.findAliexpressImage(["https://ko.aliexpress.com/item/1005.html"], auth), "https://ae01.alicdn.com/a.jpg");
  assert.equal(ali.extractAliexpressProductId("https://a.aliexpress.com/_x?productId=1234567890"), "1234567890");
});

test("알리: 빈도 제한(ApiCallLimit)이면 기다렸다가 다시 시도", async () => {
  let n = 0;
  const fetch = async () => (++n === 1
    ? json({ error_response: { code: "ApiCallLimit", msg: "ban" } })
    : json({ aliexpress_affiliate_link_generate_response: { resp_result: { result: { promotion_links: { promotion_link: [{ promotion_link: "L" }] } } } } }));
  const ali = load("aliexpress.ts", { fetch });
  assert.equal(await ali.createAliexpressPromotionLink("u", { appKey: "K", appSecret: "S", trackingId: "T" }), "L");
  assert.equal(n, 2);
});

test("토스: 프록시가 없으면 안내 문구, 쉐어링크는 tacaItemId를 우선하고 NaN은 보내지 않음", async () => {
  const sent = [];
  const undici = {
    ProxyAgent: class { constructor(url) { this.url = url; } },
    fetch: async (url, init) => {
      sent.push({ url, init });
      if (url.includes("oauth2")) return json({ access_token: "tok", expires_in: 3600 });
      if (url.includes("/links")) return json({ resultType: "SUCCESS", success: { shortUrl: "https://toss.im/s", originUrl: "https://toss.shopping/o" } });
      return json({ resultType: "SUCCESS", success: { items: [{ tacaItemId: 7, displayName: "상품", thumbnailUrl: "t", displayPrice: 100 }], nextCursor: "n" } });
    },
  };
  const none = load("toss.ts", { mocks: { undici }, env: {} });
  assert.equal(none.isTossProxyConfigured(), false);
  await assert.rejects(none.getCategories({ accessKey: "A", secretKey: "B" }), /FIXIE_URL/);

  const toss = load("toss.ts", { mocks: { undici }, env: { FIXIE_URL: " http://proxy " } });
  const page = await toss.getBestSelling({ accessKey: "A", secretKey: "B" }, { size: 5 });
  assert.deepEqual({ ...page.products[0] }, { tacaId: null, tacaItemId: 7, productName: "상품", imageUrl: "t", price: 100, productUrl: null });
  assert.equal(page.nextCursor, "n");
  assert.match(sent.find((c) => c.url.includes("best-selling")).url, /size=5/);
  const link = await toss.issueShareLink({ accessKey: "A", secretKey: "B", publisherId: "P" }, { tacaItemId: 7, tacaId: NaN });
  assert.equal(link.shortUrl, "https://toss.im/s");
  assert.deepEqual(JSON.parse(sent.find((c) => c.url.includes("/links")).init.body), { publisherId: "P", tacaItemId: 7 });
  await assert.rejects(toss.issueShareLink({ accessKey: "A", secretKey: "B", publisherId: "P" }, { tacaId: NaN }), /식별 번호/);
});
