import test from "node:test";
import assert from "node:assert/strict";
import {
  ASPECTS, BACKGROUND, CAMERA, COLOR, FILM, LIGHTING, OUTFIT, POSE, RETOUCH, SKIN, ALL_RETOUCH, NO_RETOUCH, byId,
} from "../src/lib/portrait/options.ts";
import { PURPOSES, getPurpose } from "../src/lib/portrait/purposes.ts";
import { buildPrompt } from "../src/lib/portrait/prompt.ts";
import { MAX_IMAGE_B64, parseGenerateRequest } from "../src/lib/portrait/validate.ts";
import { LICENSE, coverCrop, edgeFor, fitWithin, toneFilter, whitenBackground } from "../src/lib/portrait/post.ts";

const lists = { LIGHTING, CAMERA, SKIN, BACKGROUND, POSE, OUTFIT, FILM, COLOR };

test("옵션 데이터: id 중복 없음, 개수, 비어 있지 않은 문구", () => {
  for (const [name, list] of Object.entries(lists)) {
    assert.equal(new Set(list.map((o) => o.id)).size, list.length, `${name} id 중복`);
    for (const o of list) assert.ok(o.id && o.label, `${name} ${o.id}`);
  }
  for (const list of [LIGHTING, CAMERA, SKIN, BACKGROUND, POSE, OUTFIT, FILM]) for (const o of list) assert.ok(o.fragment.length > 10, o.id);
  assert.deepEqual([LIGHTING.length, CAMERA.length, SKIN.length, BACKGROUND.length, POSE.length, OUTFIT.length, FILM.length, COLOR.length, ASPECTS.length],
    [6, 4, 10, 19, 18, 12, 5, 13, 9]);
  assert.equal(RETOUCH.length, 4);
});

test("촬영 목적: 모든 id가 실제 옵션을 가리킨다(원본의 조용한 실패 방지)", () => {
  assert.equal(PURPOSES.length, 5);
  for (const p of PURPOSES) {
    assert.ok(byId(POSE, p.poseId), `${p.id} pose ${p.poseId}`);
    assert.ok(byId(LIGHTING, p.lightingId), `${p.id} lighting ${p.lightingId}`);
    assert.ok(byId(BACKGROUND, p.backgroundId), `${p.id} background ${p.backgroundId}`);
    assert.ok(byId(COLOR, p.colorId), `${p.id} color ${p.colorId}`);
    assert.ok(byId(OUTFIT, p.outfitId), `${p.id} outfit ${p.outfitId}`);
    assert.ok(byId(FILM, p.filmId), `${p.id} film ${p.filmId}`);
    assert.ok(byId(CAMERA, p.cameraId), `${p.id} camera ${p.cameraId}`);
    for (const s of p.skinIds) assert.ok(byId(SKIN, s), `${p.id} skin ${s}`);
    assert.ok(ASPECTS.some((a) => a.value === p.aspect), `${p.id} aspect`);
    // 프리셋으로 만든 프롬프트가 항상 조립된다
    const prompt = buildPrompt({
      lightingId: p.lightingId, cameraId: p.cameraId, skinIds: p.skinIds, poseId: p.poseId, outfitId: p.outfitId, filmId: p.filmId,
      colorId: p.colorId, backgroundId: p.backgroundId, retouch: p.retouch, truePerspective: false, symmetry: p.symmetry,
    });
    assert.ok(prompt && prompt.includes("IDENTITY FIRST"), p.id);
  }
  assert.equal(getPurpose("id-photo").aspect, "3:4");
  assert.equal(getPurpose("nope"), undefined);
});

const base = (over = {}) => ({
  lightingId: "softbox", cameraId: "dslr-85", skinIds: ["pores"], poseId: "soft-smile", outfitId: "classic-suit", filmId: "portra",
  colorId: "charcoal", backgroundId: "solid", retouch: NO_RETOUCH, truePerspective: false, symmetry: false, ...over,
});

test("프롬프트 조립: 슬롯·플래그·알 수 없는 id", () => {
  const p = buildPrompt(base());
  assert.match(p, /OUTFIT: a well-tailored dark formal/);
  assert.match(p, /BACKGROUND: a seamless solid backdrop in charcoal gray/);
  assert.match(p, /Keep exactly the same left-to-right orientation/);
  assert.ok(!p.includes("ID-STYLE FRAMING"));
  assert.ok(!p.includes("NATURAL RETOUCHING"));
  assert.ok(!/\{[a-zA-Z]+\}/.test(p), "치환되지 않은 슬롯이 남지 않음");

  const t = buildPrompt(base({ truePerspective: true, symmetry: true, retouch: ALL_RETOUCH, skinIds: [] }));
  assert.match(t, /already been horizontally inverted/);
  assert.match(t, /ID-STYLE FRAMING/);
  assert.match(t, /NATURAL RETOUCHING/);
  assert.match(t, /SKIN DETAIL: natural realistic skin/);
  assert.equal((t.match(/^- /gm) || []).length >= 4, true);

  assert.equal(buildPrompt(base({ poseId: "kodak-portra-400" })), null);
  assert.equal(buildPrompt(base({ skinIds: ["pores", "ghost"] })), null);
  assert.equal(buildPrompt(base({ backgroundId: "id-white" })).includes("RGB 255,255,255"), true);
});

const okBody = () => ({
  image: { data: "A".repeat(200), mimeType: "image/jpeg" },
  model: "flash", resolution: "1K", aspect: "3:4",
  options: { ...base(), retouch: { ...ALL_RETOUCH } },
});

test("요청 검증: 정상·각 오류", () => {
  assert.equal(parseGenerateRequest(okBody()).ok, true);
  const v = parseGenerateRequest(okBody()).value;
  assert.equal(v.prompt.poseId, "soft-smile");
  assert.deepEqual(v.prompt.retouch, ALL_RETOUCH);

  const bad = (mut) => { const b = okBody(); mut(b); return parseGenerateRequest(b); };
  assert.equal(bad((b) => { b.image = undefined; }).ok, false);
  assert.equal(bad((b) => { b.image.mimeType = "image/gif"; }).ok, false);
  assert.equal(bad((b) => { b.image.data = "A".repeat(MAX_IMAGE_B64 + 1); }).ok, false);
  assert.equal(bad((b) => { b.image.data = "한글!!".repeat(60); }).ok, false);
  assert.equal(bad((b) => { b.model = "ultra"; }).ok, false);
  assert.equal(bad((b) => { b.resolution = "8K"; }).ok, false);
  assert.equal(bad((b) => { b.aspect = "2:1"; }).ok, false);
  assert.equal(bad((b) => { b.options.skinIds = new Array(11).fill("pores"); }).ok, false);
  assert.equal(bad((b) => { b.options.retouch.mouth = "yes"; }).ok, false);
  assert.equal(bad((b) => { b.options.lightingId = 5; }).ok, false);
  assert.equal(bad((b) => { b.options.symmetry = "true"; }).ok, false);
  // 알 수 없는 옵션 id는 검증은 통과하고 프롬프트 조립에서 거른다
  const unknown = parseGenerateRequest((() => { const b = okBody(); b.options.poseId = "zzz"; return b; })());
  assert.equal(unknown.ok, true);
  assert.equal(buildPrompt(unknown.value.prompt), null);
});

test("후처리 계산: 크기·잘라내기·톤", () => {
  assert.deepEqual(fitWithin(4000, 2000, 1600), { width: 1600, height: 800 });
  assert.deepEqual(fitWithin(800, 600, 1600), { width: 800, height: 600 });
  assert.equal(edgeFor("1K"), 1024);
  assert.equal(edgeFor("4K"), 4096);
  // 가로가 넓은 원본: 좌우를 잘라 413:531 비율
  const c1 = coverCrop(2000, 1000, LICENSE.width, LICENSE.height);
  assert.equal(c1.sy, 0);
  assert.ok(Math.abs(c1.sw / c1.sh - LICENSE.width / LICENSE.height) < 0.01);
  assert.equal(c1.sx, Math.round((2000 - c1.sw) / 2));
  // 세로가 긴 원본: 아래를 더 잘라 머리 여백 유지
  const c2 = coverCrop(1000, 2000, LICENSE.width, LICENSE.height, 0.15);
  assert.equal(c2.sx, 0);
  assert.ok(c2.sy < (2000 - c2.sh) / 2);
  assert.equal(toneFilter(0, 0, 0), "brightness(1) contrast(1)");
  assert.equal(toneFilter(10, 5, -20), "brightness(1.15) contrast(0.8)");
  assert.equal(toneFilter(999, 0, NaN), "brightness(1.5) contrast(1)");
});

function canvasOf(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [r, g, b] = fn(x, y); const o = (y * w + x) * 4; d[o] = r; d[o + 1] = g; d[o + 2] = b; d[o + 3] = 255; }
  return d;
}

test("순백 배경 정리: 가장자리와 이어진 밝은 영역만 바뀐다", () => {
  const W = 40, H = 40;
  // 연회색(230) 배경, 가운데 어두운 인물(60), 인물 안의 밝은 점(250, 가장자리와 안 이어짐)
  const px = (x, y) => {
    const inPerson = x >= 10 && x < 30 && y >= 10 && y < 35;
    if (x >= 18 && x < 22 && y >= 18 && y < 22) return [250, 250, 250];
    return inPerson ? [60, 50, 50] : [230, 228, 226];
  };
  const d = canvasOf(W, H, px);
  const { changed, ratio } = whitenBackground(d, W, H);
  const at = (x, y) => d.slice((y * W + x) * 4, (y * W + x) * 4 + 3).join(",");
  assert.equal(at(0, 0), "255,255,255");
  assert.equal(at(5, 20), "255,255,255");
  assert.equal(at(15, 15), "60,50,50", "인물은 그대로");
  assert.equal(at(20, 20), "250,250,250", "인물 안의 밝은 점은 건드리지 않음");
  const personArea = 20 * 25;
  assert.equal(changed, W * H - personArea);
  assert.ok(ratio > 0.5 && ratio < 0.7);

  // 어두운 배경이면 아무것도 바꾸지 않는다
  const dark = canvasOf(10, 10, () => [20, 20, 20]);
  assert.equal(whitenBackground(dark, 10, 10).changed, 0);
  // 채도가 높은 색 배경도 바꾸지 않는다
  const colored = canvasOf(10, 10, () => [255, 120, 120]);
  assert.equal(whitenBackground(colored, 10, 10).changed, 0);
  // 전체가 밝은 회색이면 전부 순백이 된다
  const all = canvasOf(8, 8, () => [215, 215, 215]);
  assert.equal(whitenBackground(all, 8, 8).ratio, 1);
});
