// W01c(2026-11-18, CC-SNS-01) — 참고 이미지 형식 경계 시험. 실제 AI 호출 없음(생성 함수는 가짜로 넣고 호출 횟수만 센다).
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseImageDataUrl,
  collectReferences,
  buildReferenceParts,
  readJsonBodyLimited,
  handleGenerateImageRequest,
  PER_IMAGE_MAX_BYTES,
  TOTAL_MAX_BYTES,
  JSON_BODY_MAX_BYTES,
} from "../src/lib/referenceImage.ts";

// 실제 1×1 이미지(널리 쓰이는 최소 파일)
const PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const JPEG = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP////////////////////////////////////////////////////////////////////////////////////8AAP/AAAsIAAEAAQEBEQD/xAAUAAEAAAAAAAAAAAAAAAAAAAAD/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAAPwBH/9k=";
const WEBP = "UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
const GIF = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
// HEIC·AVIF: 작은 실제 파일을 만들 도구가 없어 ftyp 머리만 만든 합성 고정값(서명 판정 시험용, 실제 디코드 가능한 파일 아님)
const ftyp = (brand) => Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftyp" + brand + "\0\0\0\0mif1"), Buffer.alloc(8)]).toString("base64");
const HEIC = ftyp("heic");
const HEIF = ftyp("mif1");
const AVIF = ftyp("avif");
const url = (mime, b64) => `data:${mime};base64,${b64}`;

test("정상: 형식별 실제 서명과 머리 MIME이 맞으면 통과", () => {
  for (const [mime, b64] of [["image/png", PNG], ["image/jpeg", JPEG], ["image/webp", WEBP], ["image/heic", HEIC], ["image/heif", HEIF]]) {
    const r = parseImageDataUrl(url(mime, b64));
    assert.equal(r.ok, true, mime);
    assert.equal(r.image.mime, mime);
    assert.equal(r.image.bytes, Buffer.from(b64, "base64").length);
  }
});

test("HEIC 브랜드 파일을 image/heif로 적어도 허용(HEIF 계열), AVIF는 HEIF로 오인하지 않음", () => {
  assert.equal(parseImageDataUrl(url("image/heif", HEIC)).ok, true);
  assert.equal(parseImageDataUrl(url("image/heif", AVIF)).code, "REFERENCE_UNSUPPORTED");
  assert.equal(parseImageDataUrl(url("image/avif", AVIF)).code, "REFERENCE_UNSUPPORTED");
  assert.equal(parseImageDataUrl(url("image/heic", HEIF)).code, "REFERENCE_INVALID", "mif1 범용 브랜드는 heic로 보지 않음");
});

test("머리 MIME과 실제 바이트가 다르면 거절", () => {
  assert.equal(parseImageDataUrl(url("image/png", JPEG)).code, "REFERENCE_INVALID");
  assert.equal(parseImageDataUrl(url("image/jpeg", PNG)).code, "REFERENCE_INVALID");
  assert.equal(parseImageDataUrl(url("image/webp", PNG)).code, "REFERENCE_INVALID");
});

test("지원하지 않는 형식(gif·avif·대문자 MIME·매개변수)", () => {
  assert.equal(parseImageDataUrl(url("image/gif", GIF)).code, "REFERENCE_UNSUPPORTED");
  assert.equal(parseImageDataUrl(url("IMAGE/PNG", PNG)).code, "REFERENCE_UNSUPPORTED");
  assert.equal(parseImageDataUrl(`data:image/png;charset=x;base64,${PNG}`).code, "REFERENCE_INVALID");
});

test("data URL이 아닌 값·빈 값·깨진 base64", () => {
  for (const v of ["https://x.supabase.co/storage/v1/object/sign/a.jpg?token=t", "", "   ", null, undefined, 123, [], {}, `data:image/png,${PNG}`]) {
    assert.equal(parseImageDataUrl(v).ok, false, String(v));
  }
  assert.equal(parseImageDataUrl(url("image/png", PNG.slice(0, -1))).code, "REFERENCE_INVALID", "길이가 4의 배수가 아님");
  assert.equal(parseImageDataUrl(url("image/png", "iVBO*w0K")).code, "REFERENCE_INVALID");
  assert.equal(parseImageDataUrl(url("image/png", "iVBO w0K")).code, "REFERENCE_INVALID");
  assert.equal(parseImageDataUrl(url("image/png", PNG + "\n")).code, "REFERENCE_INVALID");
  assert.equal(parseImageDataUrl(url("image/png", "")).code, "REFERENCE_INVALID");
});

test("장당 상한 초과", () => {
  const big = Buffer.concat([Buffer.from(PNG, "base64"), Buffer.alloc(PER_IMAGE_MAX_BYTES)]).toString("base64");
  assert.equal(parseImageDataUrl(url("image/png", big)).code, "REFERENCE_TOO_LARGE");
});

test("collectReferences: 실제로 보낼 것만 검사(광고 모드 아님·보정 아님이면 상품·직전 결과는 무시)", () => {
  const r = collectReferences({ personImage: url("image/png", PNG), productImages: ["broken"], lastResultImage: "https://x" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.items.map((i) => i.field), ["personImage"]);
});

test("collectReferences: 순서·필드·개수·합계 상한", () => {
  const ok = collectReferences({ personImage: url("image/png", PNG), placeImage: url("image/jpeg", JPEG), isAdMode: true, productImages: [url("image/webp", WEBP)], lastResultImage: url("image/png", PNG), feedback: "x" });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.items.map((i) => i.field), ["personImage", "placeImage", "productImages", "lastResultImage"]);
  const four = collectReferences({ isAdMode: true, productImages: Array(4).fill(url("image/png", PNG)) });
  assert.deepEqual([four.ok, four.code, four.field], [false, "REFERENCE_TOO_MANY", "productImages"]);
  const notArr = collectReferences({ isAdMode: true, productImages: url("image/png", PNG) });
  assert.deepEqual([notArr.ok, notArr.code, notArr.field], [false, "REFERENCE_INVALID", "productImages"]);
  const badPerson = collectReferences({ personImage: ["x"] });
  assert.deepEqual([badPerson.ok, badPerson.code, badPerson.field], [false, "REFERENCE_INVALID", "personImage"]);
  const third = collectReferences({ isAdMode: true, productImages: [url("image/png", PNG), url("image/png", PNG), url("image/gif", GIF)] });
  assert.deepEqual([third.code, third.field, third.index], ["REFERENCE_UNSUPPORTED", "productImages", 2]);
  const near = Buffer.concat([Buffer.from(PNG, "base64"), Buffer.alloc(PER_IMAGE_MAX_BYTES - 200)]).toString("base64");
  const total = collectReferences({ personImage: url("image/png", near), placeImage: url("image/png", near), isAdMode: true, productImages: [url("image/png", near)] });
  assert.ok(3 * (PER_IMAGE_MAX_BYTES - 200) > TOTAL_MAX_BYTES);
  assert.deepEqual([total.ok, total.code, total.field], [false, "REFERENCE_TOO_LARGE", "total"]);
});

test("buildReferenceParts: 실제 MIME으로 전달(png 고정 아님)", () => {
  const r = collectReferences({ personImage: url("image/jpeg", JPEG), placeImage: url("image/webp", WEBP) });
  assert.deepEqual(buildReferenceParts(r.items), [
    { inlineData: { data: JPEG, mimeType: "image/jpeg" } },
    { inlineData: { data: WEBP, mimeType: "image/webp" } },
  ]);
});

const req = (body, headers = {}) => new Request("http://local/api/generate-image", { method: "POST", body, headers });

test("readJsonBodyLimited: 상한 초과 413, 깨진 UTF-8·JSON 400", async () => {
  assert.deepEqual(await readJsonBodyLimited(req('{"a":1}'), 100), { ok: true, value: { a: 1 } });
  assert.equal((await readJsonBodyLimited(req("x".repeat(101)), 100)).status, 413);
  assert.equal((await readJsonBodyLimited(req("{}", { "content-length": "999999" }), 100)).status, 413);
  assert.equal((await readJsonBodyLimited(req(new Uint8Array([0x7b, 0xff, 0x7d])), 100)).status, 400);
  assert.equal((await readJsonBodyLimited(req("{bad"), 100)).status, 400);
  assert.equal((await readJsonBodyLimited(req(""), 100)).status, 400);
  assert.equal(JSON_BODY_MAX_BYTES, 3 * 1024 * 1024);
});

function fakeGenerate() {
  const calls = [];
  return { calls, fn: async (config) => { calls.push(config); return "data:image/png;base64," + PNG; } };
}

test("요청 처리: 잘못된 참고 이미지·본문은 유료 생성 호출 0", async () => {
  const cases = [
    [JSON.stringify({ personImage: "https://x/y.jpg" }), 400, "REFERENCE_INVALID", "personImage"],
    [JSON.stringify({ placeImage: url("image/gif", GIF) }), 400, "REFERENCE_UNSUPPORTED", "placeImage"],
    [JSON.stringify({ lastResultImage: "https://signed", feedback: "더 밝게" }), 400, "REFERENCE_INVALID", "lastResultImage"],
    [JSON.stringify([1, 2]), 400, "BODY_INVALID", undefined],
    ["{bad", 400, "BODY_INVALID", undefined],
    ["x".repeat(JSON_BODY_MAX_BYTES + 1), 413, "BODY_TOO_LARGE", undefined],
  ];
  for (const [body, status, code, field] of cases) {
    const g = fakeGenerate();
    const r = await handleGenerateImageRequest(req(body), g.fn);
    assert.equal(r.status, status, code);
    assert.equal(r.body.code, code);
    assert.equal(r.body.field, field);
    assert.equal(typeof r.body.error, "string");
    assert.equal(g.calls.length, 0, `${code}: 생성 호출 없어야 함`);
  }
});

test("요청 처리: 정상 요청은 생성 1회, 참고 이미지 없는 일반 생성도 그대로", async () => {
  for (const cfg of [{}, { personImage: url("image/jpeg", JPEG), gender: "f" }]) {
    const g = fakeGenerate();
    const r = await handleGenerateImageRequest(req(JSON.stringify(cfg)), g.fn);
    assert.equal(r.status, 200);
    assert.equal(r.body.success, true);
    assert.equal(g.calls.length, 1);
  }
});

test("요청 처리: 생성 실패 메시지는 500으로 전달", async () => {
  const r = await handleGenerateImageRequest(req("{}"), async () => { throw new Error("본인 키 한도"); });
  assert.deepEqual([r.status, r.body.error], [500, "본인 키 한도"]);
});
