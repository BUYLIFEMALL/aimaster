// W01-FIT(2026-11-19, CC-SNS-01, Master msg_d1564fa89a51) — 보내기 직전 참고 사진 맞추기 시험.
// 실제 AI·DB·저장소·브라우저 없음. 축소기는 가짜(긴 변·화질에 비례해 작아지는 JPEG를 만든다)이고, 서버 판정은 실제 함수(handleGenerateImageRequest)로 본다.
// 캔버스를 쓰는 실제 축소(shrinkDataUrlToJpeg)는 Node에서 돌릴 수 없다 — 그 부분은 브라우저 모의로 따로 확인한다(W00_BASELINE §14-AT).
import test from "node:test";
import assert from "node:assert/strict";
import {
  fitReferencesForSend,
  collectReferences,
  handleGenerateImageRequest,
  parseImageDataUrl,
  serializedBytes,
  FIT_LADDER,
  FIT_FAIL_MESSAGE,
  PER_IMAGE_MAX_BYTES,
  TOTAL_MAX_BYTES,
  JSON_BODY_MAX_BYTES,
} from "../src/lib/referenceImage.ts";

const KB = 1024, MB = 1024 * 1024;
/** n바이트짜리 가짜 사진(머리 서명만 진짜). tag로 서로 다른 사진을 구분한다 */
const fake = (kind, n, tag = 0x41) => {
  const head = { jpeg: [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0], png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }[kind];
  const b = Buffer.alloc(n, tag); Buffer.from(head).copy(b);
  return `data:image/${kind};base64,` + b.toString("base64");
};
const bytesOf = (dataUrl) => { const r = parseImageDataUrl(dataUrl); assert.ok(r.ok, "사진으로 읽혀야 한다"); return r.image.bytes; };
/** 가짜 축소기: 원본 크기 × (긴 변/2048)² × (화질/0.9). 부른 기록을 남긴다 */
function shrinker(over = {}) {
  const calls = [];
  const fn = async (dataUrl, edge, quality) => {
    calls.push({ bytes: bytesOf(dataUrl), edge, quality });
    if (over.fail) return null;
    if (over.throws) throw new Error("축소 실패");
    if (over.bigger) return fake("jpeg", bytesOf(dataUrl) + 10);
    const n = Math.max(over.floor ?? 2 * KB, Math.round(bytesOf(dataUrl) * (edge / 2048) ** 2 * (quality / 0.9)));
    return fake("jpeg", n, 0x42);
  };
  fn.calls = calls;
  return fn;
}
const post = (body) => new Request("http://local/api/generate-image", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
/** 실제 서버 판정: 상태와 생성 호출 횟수 */
async function server(body) {
  let n = 0;
  const r = await handleGenerateImageRequest(post(body), async () => { n++; return "data:image/png;base64,AAAA"; });
  return { status: r.status, generate: n };
}
const refsOf = (c) => [c.personImage, c.placeImage, ...(c.isAdMode ? c.productImages ?? [] : []), ...(c.feedback ? [c.lastResultImage] : [])].filter(Boolean);
const totalOf = (c) => refsOf(c).reduce((s, d) => s + bytesOf(d), 0);

// ── 세 가지 재현(§14-AS ④): 맞추기 전에는 서버가 거절, 맞춘 뒤에는 통과 ──
const REPRO = [
  ["인물 900 + 장소 900 + 상품 1장 300KB(합 2.1MB)", { personImage: fake("jpeg", 900 * KB), placeImage: fake("jpeg", 900 * KB, 0x43), isAdMode: true, productImages: [fake("jpeg", 300 * KB, 0x44)] }],
  ["인물 700 + 장소 700 + 상품 3장×300KB(합 2.3MB)", { personImage: fake("jpeg", 700 * KB), placeImage: fake("jpeg", 700 * KB, 0x43), isAdMode: true, productImages: [fake("jpeg", 300 * KB, 0x44), fake("jpeg", 300 * KB, 0x45), fake("jpeg", 300 * KB, 0x46)] }],
  ["보정: 인물 700 + 장소 700 + 직전 결과 700KB(합 2.1MB)", { personImage: fake("jpeg", 700 * KB), placeImage: fake("jpeg", 700 * KB, 0x43), feedback: "톤 보정", lastResultImage: fake("jpeg", 700 * KB, 0x47) }],
];
for (const [name, config] of REPRO) {
  test(`재현 — ${name}: 맞추기 전 거절 → 맞춘 뒤 통과, 사진 수 그대로`, async () => {
    const before = await server(config);
    assert.equal(before.status, 400, "맞추기 전에는 서버가 거절해야 재현이 성립한다");
    assert.equal(before.generate, 0);
    const shrink = shrinker();
    const snapshot = JSON.stringify(config);
    const r = await fitReferencesForSend(config, { shrink });
    assert.equal(r.ok, true);
    assert.equal(r.changed, true);
    assert.equal(JSON.stringify(config), snapshot, "받은 설정(화면의 원본)은 바뀌지 않는다");
    assert.notEqual(r.config, config, "보내는 사본은 새 객체다");
    assert.equal(refsOf(r.config).length, refsOf(config).length, "사진을 빼지 않는다");
    if (config.productImages) assert.equal(r.config.productImages.length, config.productImages.length);
    assert.ok(totalOf(r.config) <= TOTAL_MAX_BYTES, "합계 2MiB 이하");
    assert.ok(serializedBytes(r.config) <= JSON_BODY_MAX_BYTES, "본문 3MiB 이하");
    assert.equal(collectReferences(r.config).ok, true, "화면의 사전 검사도 통과");
    const after = await server(r.config);
    assert.deepEqual(after, { status: 200, generate: 1 }, "맞춘 뒤에는 서버가 받고 생성이 1회 불린다");
    assert.ok(shrink.calls.length >= 1);
  });
}

test("가장 큰 사진부터 줄이고, 맞는 순간 멈춘다 — 작은 사진은 그대로", async () => {
  const small = fake("jpeg", 300 * KB, 0x44);
  const config = { personImage: fake("jpeg", 900 * KB), placeImage: fake("jpeg", 900 * KB, 0x43), isAdMode: true, productImages: [small] };
  const shrink = shrinker();
  const r = await fitReferencesForSend(config, { shrink });
  assert.equal(r.ok, true);
  assert.equal(r.config.productImages[0], small, "작은 상품 사진은 원본 그대로");
  assert.equal(shrink.calls.every((c) => c.bytes === 900 * KB), true, "축소를 부른 것은 큰 사진뿐");
  assert.equal(shrink.calls[0].edge, FIT_LADDER[0].edge, "첫 단계부터 시작");
});

// ── 이미 맞는 입력: 그대로(같은 객체), 축소 0 ──
const FITS = [
  ["참고 사진 없음", { gender: "여성" }],
  ["단일 — 인물 300KB", { personImage: fake("jpeg", 300 * KB) }],
  ["단일 — 인물 정확히 1MiB", { personImage: fake("jpeg", MB) }],
  ["다중 — 인물 900 + 장소 900(합 1.8MB)", { personImage: fake("jpeg", 900 * KB), placeImage: fake("jpeg", 900 * KB, 0x43) }],
  ["다중 — 인물 500 + 장소 500 + 상품 3장×300(합 1.9MB)", { personImage: fake("jpeg", 500 * KB), placeImage: fake("jpeg", 500 * KB, 0x43), isAdMode: true, productImages: [fake("jpeg", 300 * KB, 0x44), fake("jpeg", 300 * KB, 0x45), fake("jpeg", 300 * KB, 0x46)] }],
  ["보정 — 인물 600 + 직전 결과 1MiB(합 1.6MB)", { personImage: fake("jpeg", 600 * KB), feedback: "톤 보정", lastResultImage: fake("jpeg", MB, 0x47) }],
  ["PNG — 인물 300KB", { personImage: fake("png", 300 * KB) }],
];
for (const [name, config] of FITS) {
  test(`이미 맞는 입력 — ${name}: 같은 객체 그대로, 축소 0, 서버 통과`, async () => {
    const shrink = shrinker();
    const r = await fitReferencesForSend(config, { shrink });
    assert.equal(r.ok, true);
    assert.equal(r.changed, false);
    assert.equal(r.config, config, "같은 객체를 그대로 돌려준다");
    assert.equal(shrink.calls.length, 0);
    assert.deepEqual(await server(r.config), { status: 200, generate: 1 });
  });
}

test("쓰이지 않는 칸(작음) — 본문이 한도 안이면 세지도 바꾸지도 않는다", async () => {
  const config = { personImage: fake("jpeg", 300 * KB), isAdMode: false, productImages: [fake("jpeg", 200 * KB, 0x44)], lastResultImage: fake("jpeg", 200 * KB, 0x47) };
  const shrink = shrinker();
  const r = await fitReferencesForSend(config, { shrink });
  assert.equal(r.changed, false);
  assert.equal(r.config, config);
  assert.equal(shrink.calls.length, 0);
  assert.deepEqual(await server(r.config), { status: 200, generate: 1 });
});

test("쓰이지 않는 칸(큼) — 광고 모드를 껐는데 남은 상품 사진·보정 요청 없는 직전 결과가 본문을 넘기면, 그 칸만 보내는 사본에서 빼고 쓰이는 사진은 그대로", async () => {
  const person = fake("jpeg", 900 * KB), place = fake("jpeg", 900 * KB, 0x43);
  const config = { personImage: person, placeImage: place, isAdMode: false, productImages: [fake("jpeg", 900 * KB, 0x44), fake("jpeg", 900 * KB, 0x45)], lastResultImage: fake("jpeg", 900 * KB, 0x47) };
  assert.equal((await server(config)).status, 413, "빼기 전에는 본문 상한에 걸린다(생성에 쓰이지도 않는 사진 때문에)");
  const snapshot = JSON.stringify(config);
  const shrink = shrinker();
  const r = await fitReferencesForSend(config, { shrink });
  assert.equal(r.ok, true);
  assert.equal(r.changed, true);
  assert.equal(shrink.calls.length, 0, "쓰이는 사진은 줄이지 않았다");
  assert.equal(r.config.personImage, person);
  assert.equal(r.config.placeImage, place);
  assert.equal("productImages" in r.config, false);
  assert.equal("lastResultImage" in r.config, false);
  assert.equal(JSON.stringify(config), snapshot, "화면의 원본 설정은 그대로(상품 사진이 남아 있다)");
  assert.deepEqual(await server(r.config), { status: 200, generate: 1 });
});

test("쓰이지 않는 칸을 빼도 넘으면 — 이어서 쓰이는 사진을 줄여 맞춘다", async () => {
  const config = { personImage: fake("jpeg", 900 * KB), placeImage: fake("jpeg", 900 * KB, 0x43), feedback: "톤 보정", lastResultImage: fake("jpeg", 900 * KB, 0x47), isAdMode: false, productImages: [fake("jpeg", 900 * KB, 0x44)] };
  const shrink = shrinker();
  const r = await fitReferencesForSend(config, { shrink });
  assert.equal(r.ok, true);
  assert.equal("productImages" in r.config, false);
  assert.equal(refsOf(r.config).length, 3, "쓰이는 사진 3장(인물·장소·직전 결과)은 모두 남는다");
  assert.ok(shrink.calls.length >= 1);
  assert.deepEqual(await server(r.config), { status: 200, generate: 1 });
});

test("사진과 무관하게 본문이 큰 경우 — 손대지 않는다(서버가 413으로 안내)", async () => {
  const config = { gender: "여성", note: "x".repeat(JSON_BODY_MAX_BYTES + 10) };
  const shrink = shrinker();
  const r = await fitReferencesForSend(config, { shrink });
  assert.equal(r.config, config);
  assert.equal(shrink.calls.length, 0);
  assert.equal((await server(config)).status, 413);
});

// ── 줄일 수 없을 때: 보내지 않고 안내. 사진을 빼서 통과시키지 않는다 ──
for (const [name, over] of [["축소기가 못 줄임(null)", { fail: true }], ["축소기가 던짐", { throws: true }], ["축소 결과가 더 큼", { bigger: true }], ["최소 크기가 커서 끝까지 넘음", { floor: 800 * KB }]]) {
  test(`줄일 수 없음 — ${name}: ok false + 안내 문구, 무한 반복 없음`, async () => {
    const config = { personImage: fake("jpeg", 900 * KB), placeImage: fake("jpeg", 900 * KB, 0x43), isAdMode: true, productImages: [fake("jpeg", 900 * KB, 0x44)] };
    const shrink = shrinker(over);
    const r = await fitReferencesForSend(config, { shrink });
    assert.deepEqual(r, { ok: false, message: FIT_FAIL_MESSAGE });
    assert.ok(shrink.calls.length <= FIT_LADDER.length * 3, "단계 수 × 사진 수를 넘겨 부르지 않는다");
  });
}

test("본문 3MiB — 사진 합계는 2MiB 안이어도 글자 설정이 커서 본문이 넘으면 사진을 더 줄여 맞춘다", async () => {
  const config = { personImage: fake("jpeg", 1000 * KB), placeImage: fake("jpeg", 1000 * KB, 0x43), note: "가".repeat(200 * KB) };   // 한글 1자 = 3바이트 → 약 600KB
  assert.ok(totalOf(config) <= TOTAL_MAX_BYTES);
  assert.ok(serializedBytes(config) > JSON_BODY_MAX_BYTES, "본문만 넘는 경우여야 한다");
  const r = await fitReferencesForSend(config, { shrink: shrinker() });
  assert.equal(r.ok, true);
  assert.equal(r.changed, true);
  assert.ok(serializedBytes(r.config) <= JSON_BODY_MAX_BYTES);
  assert.equal(r.config.note, config.note, "글자 설정은 건드리지 않는다");
});

test("다른 문제는 건드리지 않는다 — 형식 오류·장당 초과·개수 초과는 그대로 두고 기존 검사가 안내한다", async () => {
  const cases = [
    { personImage: "https://example.invalid/a.jpg", placeImage: fake("jpeg", 900 * KB), isAdMode: true, productImages: [fake("jpeg", 900 * KB, 0x44)] },
    { personImage: fake("jpeg", PER_IMAGE_MAX_BYTES + 1), placeImage: fake("jpeg", 900 * KB, 0x43) },
    { personImage: fake("jpeg", 900 * KB), isAdMode: true, productImages: [1, 2, 3, 4].map((i) => fake("jpeg", 600 * KB, 0x40 + i)) },
    { personImage: fake("jpeg", 900 * KB), isAdMode: true, productImages: "사진 아님" },
  ];
  for (const config of cases) {
    const shrink = shrinker();
    const r = await fitReferencesForSend(config, { shrink });
    assert.equal(r.ok, true);
    assert.equal(r.config, config, "그대로 돌려준다");
    assert.equal(shrink.calls.length, 0);
    assert.equal(collectReferences(r.config).ok, false, "기존 검사가 거절한다");
    assert.equal((await server(r.config)).generate, 0, "서버도 생성하지 않는다");
  }
});

test("서버 상한은 그대로다", () => {
  assert.equal(PER_IMAGE_MAX_BYTES, MB);
  assert.equal(TOTAL_MAX_BYTES, 2 * MB);
  assert.equal(JSON_BODY_MAX_BYTES, 3 * MB);
});
