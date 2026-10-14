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

test("규격 프리셋·후보 수 범위", async () => {
  const { SIZE_PRESETS, sizePresetById, clampCandidates, MAX_CANDIDATES, coverCrop } = await import("../src/lib/portrait/post.ts");
  assert.equal(SIZE_PRESETS.length, 19);
  assert.equal(new Set(SIZE_PRESETS.map((p) => p.id)).size, 19);
  assert.deepEqual(SIZE_PRESETS.map((p) => p.id), ["passport", "resume", "china-visa", "us-visa", "canada-passport", "uk-passport", "india-passport", "india-visa", "us-passport", "sg-passport", "vn-evisa", "hk-passport", "nz-passport", "tw-passport", "id-evisa", "ie-passport", "au-citizenship", "pl-id", "print-hires"]);
  const ratio = (id) => { const p = sizePresetById(id); return p.width / p.height; };
  assert.ok(Math.abs(ratio("china-visa") - 33 / 48) < 0.01, "중국 비자 33:48 비율");
  assert.ok(Math.abs(ratio("passport") - 35 / 45) < 0.01, "여권 35:45 비율");
  assert.ok(Math.abs(ratio("resume") - 3 / 4) < 0.01, "이력서 3:4 비율");
  const cv = sizePresetById("china-visa");
  assert.ok(cv.width >= 354 && cv.width <= 420 && cv.height >= 472 && cv.height <= 560, "중국 비자 전자 사진 픽셀 범위");
  for (const p of SIZE_PRESETS) {
    assert.ok(p.width > 0 && p.height > 0 && p.maxBytes >= 50 * 1024, p.id);
    assert.ok(p.note.includes(`${p.width}×${p.height}`), `${p.id} 안내 문구에 크기 포함`);
  }
  assert.equal(sizePresetById("us-visa").width, sizePresetById("us-visa").height, "미국 비자는 정사각");
  assert.equal(sizePresetById("nope").id, "passport", "알 수 없으면 기본 규격");
  assert.equal(MAX_CANDIDATES, 4);
  assert.deepEqual([0, 1, 2.6, 4, 9, NaN].map(clampCandidates), [1, 1, 3, 4, 4, 1]);
  // 정사각 규격에서도 자르기 비율이 맞는다
  const c = coverCrop(864, 1184, 600, 600);
  assert.ok(Math.abs(c.sw / c.sh - 1) < 0.01);
});

test("ZIP 생성: 구조·CRC·한글 이름·중복 이름", async () => {
  const { createZip, crc32, uniqueNames } = await import("../src/lib/portrait/zip.ts");
  assert.equal(crc32(new TextEncoder().encode("123456789")), 0xcbf43926, "표준 CRC32 검증값");
  assert.deepEqual(uniqueNames(["a.png", "A.png", "b.png", "a.png"]), ["a.png", "A (2).png", "b.png", "a (3).png"]);

  const f1 = new Uint8Array([1, 2, 3, 4, 5]);
  const f2 = new TextEncoder().encode("한글 내용");
  const zip = createZip([{ name: "인물사진-01.png", data: f1 }, { name: "인물사진-01.png", data: f2 }], new Date("2026-10-14T10:20:30"));
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  // 끝 레코드
  const end = zip.length - 22;
  assert.equal(dv.getUint32(end, true), 0x06054b50);
  assert.equal(dv.getUint16(end + 10, true), 2, "항목 수");
  const centralSize = dv.getUint32(end + 12, true);
  const centralOffset = dv.getUint32(end + 16, true);
  assert.equal(centralOffset + centralSize, end);
  // 첫 로컬 헤더
  assert.equal(dv.getUint32(0, true), 0x04034b50);
  assert.equal(dv.getUint16(6, true) & 0x0800, 0x0800, "UTF-8 이름 플래그");
  assert.equal(dv.getUint32(14, true), crc32(f1));
  assert.equal(dv.getUint32(18, true), 5);
  const nameLen = dv.getUint16(26, true);
  assert.equal(new TextDecoder().decode(zip.slice(30, 30 + nameLen)), "인물사진-01.png");
  assert.deepEqual([...zip.slice(30 + nameLen, 30 + nameLen + 5)], [1, 2, 3, 4, 5]);
  // 두 번째 항목은 이름이 겹치지 않게 바뀐다
  const c1 = centralOffset;
  const c1name = dv.getUint16(c1 + 28, true);
  const c2 = c1 + 46 + c1name;
  const c2name = dv.getUint16(c2 + 28, true);
  assert.equal(new TextDecoder().decode(zip.slice(c2 + 46, c2 + 46 + c2name)), "인물사진-01 (2).png");
  assert.equal(dv.getUint32(c2 + 16, true), crc32(f2));
  assert.equal(dv.getUint32(c1 + 42, true), 0, "첫 항목 오프셋 0");
});

test("규격 프리셋 확장(공식 안내 확인분)·보관 기간", async () => {
  const { SIZE_PRESETS, sizePresetById } = await import("../src/lib/portrait/post.ts");
  const ca = sizePresetById("canada-passport");
  assert.deepEqual([ca.width, ca.height, ca.minBytes], [1200, 1800, 200 * 1024]);
  assert.ok(ca.width >= 1200 && ca.height >= 1800 && ca.width <= 3000 && ca.height <= 4500, "canada.ca 안내 픽셀 범위");
  assert.ok(ca.caution && ca.caution.includes("상업 사진사"));
  const uk = sizePresetById("uk-passport");
  assert.ok(uk.width >= 600 && uk.height >= 750, "gov.uk 최소 해상도");
  assert.ok(uk.caution && uk.caution.includes("변경하지 않은"));
  assert.equal(SIZE_PRESETS.length, 19);
  for (const p of SIZE_PRESETS) assert.ok(!p.minBytes || p.minBytes < p.maxBytes, p.id);

  // 서버 보관 기간 계산(순수 함수만 — server-only 모듈이라 로직을 같은 규칙으로 검사)
  const days = [0, 7, 30, 90];
  const normalize = (v) => (typeof v === "number" && days.includes(v) ? v : 30);
  assert.deepEqual([0, 7, 30, 90, 45, "7", null, -1].map(normalize), [0, 7, 30, 90, 30, 30, 30, 30]);
});

test("규격 프리셋(인도, 공식 안내 확인분)", async () => {
  const { sizePresetById } = await import("../src/lib/portrait/post.ts");
  const ip = sizePresetById("india-passport");
  assert.deepEqual([ip.width, ip.height], [630, 810], "passportindia.gov.in ICAO 안내 630×810");
  assert.ok(ip.caution.includes("변경하지 않은"));
  const iv = sizePresetById("india-visa");
  assert.equal(iv.width, iv.height, "인도 비자는 가로·세로 같음");
  assert.deepEqual([iv.minBytes, iv.maxBytes], [10 * 1024, 300 * 1024], "indianvisaonline.gov.in 10~300KB");
});

test("규격(미국 여권·싱가포르·베트남, 공식 안내 확인분)과 저장 이름 정리", async () => {
  const { sizePresetById, safeFileName, baseNameOf, SIZE_PRESETS } = await import("../src/lib/portrait/post.ts");
  const us = sizePresetById("us-passport");
  assert.equal(us.width, us.height);
  assert.ok(us.width >= 600 && us.width <= 1200, "travel.state.gov 정사각 600~1200px 범위");
  assert.deepEqual([us.minBytes, us.maxBytes], [54 * 1024, 10 * 1024 * 1024]);
  const sg = sizePresetById("sg-passport");
  assert.deepEqual([sg.width, sg.height], [400, 514], "ica.gov.sg 400×514");
  assert.ok(sg.maxBytes <= 150 * 1024, "안내 간 차이가 있어 보수적(150KB 이하)");
  const vn = sizePresetById("vn-evisa");
  assert.ok(Math.abs(vn.width / vn.height - 4 / 6) < 0.01, "4×6cm 비율");
  assert.ok(vn.maxBytes <= 50 * 1024);
  for (const p of SIZE_PRESETS.filter((x) => x.caution)) assert.ok(p.caution.length > 20, p.id);

  assert.equal(safeFileName('a/b\c:d*e?f"g<h>i|j', "x"), "abcdefghij");
  assert.equal(safeFileName("   ", "대체"), "대체");
  assert.equal(safeFileName("..숨김", "x"), "숨김");
  assert.equal(safeFileName("가".repeat(60), "x").length, 40);
  assert.equal(safeFileName("내   사진   01", "x"), "내 사진 01");
  assert.equal(baseNameOf("홍길동.증명.jpg"), "홍길동.증명");
  assert.equal(baseNameOf("noext"), "noext");
});

test("머리 비율 평가·순서 이동·신규 규격(공식 확인분)", async () => {
  const { evaluateHead, headInCrop, moveItem, sizePresetById, SIZE_PRESETS } = await import("../src/lib/portrait/post.ts");
  // 공식 범위(출처와 함께)
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const kr = sizePresetById("passport");
  assert.ok(near(kr.headRange[0], 32 / 45) && near(kr.headRange[1], 36 / 45));
  assert.deepEqual(sizePresetById("canada-passport").headRange, [0.45, 0.5]);
  assert.deepEqual(sizePresetById("us-visa").headRange, [0.5, 0.69]);
  assert.ok(near(sizePresetById("hk-passport").headRange[0], 32 / 50));
  for (const p of SIZE_PRESETS.filter((x) => x.headRange)) {
    assert.ok(p.headSource, `${p.id} 출처 필요`);
    assert.ok(p.headRange[0] > 0.3 && p.headRange[1] < 0.9 && p.headRange[0] < p.headRange[1], p.id);
  }
  assert.ok(sizePresetById("passport").caution.includes("AI"), "외교부 여권안내 AI 불허 안내");
  const hk = sizePresetById("hk-passport");
  assert.ok(hk.width >= 1200 && hk.height >= 1600 && Math.abs(hk.width / hk.height - 0.8) < 0.01, "홍콩 40×50, 최소 1200×1600");
  const nz = sizePresetById("nz-passport");
  assert.ok(nz.width >= 900 && nz.width <= 4500 && nz.height >= 1200 && nz.height <= 6000 && Math.abs(nz.width / nz.height - 0.75) < 0.01, "뉴질랜드 3:4 범위");
  assert.deepEqual([nz.minBytes, nz.maxBytes], [250 * 1024, 5 * 1024 * 1024]);

  // 평가
  const range = [0.71, 0.8];
  assert.equal(evaluateHead(0.75, range).status, "ok");
  assert.equal(evaluateHead(0.69, range).status, "ok", "허용 오차 0.02");
  assert.equal(evaluateHead(0.6, range).status, "small");
  assert.equal(evaluateHead(0.9, range).status, "large");
  // 3:4 이미지(864×1184)에서 규격 413×531로 자르면 가로가 더 좁아져 세로 비율이 거의 같다
  const m = headInCrop(0.2, 0.7, 864, 1184, { width: 413, height: 531 });
  assert.ok(m.ratio > 0.48 && m.ratio < 0.56, `비율 ${m.ratio}`);
  assert.ok(m.topMargin > 0.15 && m.topMargin < 0.25);
  assert.equal(m.cropped, false);
  // 가로로 긴 이미지를 정사각 규격으로 자르면 세로 전체가 쓰여 비율 = 원래 비율
  const sq = headInCrop(0.2, 0.7, 2000, 1000, { width: 600, height: 600 });
  assert.ok(Math.abs(sq.ratio - 0.5) < 1e-6);
  // 머리가 잘리는 경우
  assert.equal(headInCrop(0.02, 0.5, 1000, 2000, { width: 413, height: 531 }).cropped, true);

  // 순서 이동
  assert.deepEqual(moveItem([1, 2, 3, 4], 0, 2), [2, 3, 1, 4]);
  assert.deepEqual(moveItem([1, 2, 3], 2, 0), [3, 1, 2]);
  const same = [1, 2, 3];
  assert.equal(moveItem(same, 1, 1), same);
  assert.equal(moveItem(same, -1, 1), same);
  assert.equal(moveItem(same, 0, 3), same);
});

test("확대 자르기·대만 규격", async () => {
  const { tightCrop, headInCrop, evaluateHead, sizePresetById } = await import("../src/lib/portrait/post.ts");
  const tw = sizePresetById("tw-passport");
  assert.deepEqual([tw.width, tw.height], [413, 531], "boca.gov.tw 최소 413×531");
  assert.equal(tw.maxBytes, 5 * 1024 * 1024);
  assert.ok(Math.abs(tw.headRange[0] - 32 / 45) < 1e-9 && tw.headSource.includes("boca.gov.tw"));
  assert.ok(tw.caution.includes("거울상"));

  const preset = { width: 413, height: 531 };
  // 머리가 작은 사진: 864×1184, 정수리 20% ~ 턱 56%(머리 36%)
  const before = headInCrop(0.2, 0.56, 864, 1184, preset);
  assert.ok(before.ratio < 0.45, "원래 머리가 작다");
  const t = tightCrop(0.2, 0.56, 864, 1184, preset, 0.755);
  assert.ok(Math.abs(t.achievedRatio - 0.755) < 0.01, `달성 ${t.achievedRatio}`);
  assert.equal(t.clamped, false);
  assert.ok(Math.abs(t.crop.sw / t.crop.sh - 413 / 531) < 0.01, "규격 비율");
  assert.ok(t.crop.sx >= 0 && t.crop.sy >= 0 && t.crop.sx + t.crop.sw <= 864 && t.crop.sy + t.crop.sh <= 1184, "원본 범위 안");
  assert.ok(Math.abs(t.crop.sx + t.crop.sw / 2 - 432) <= 1, "가로 중앙");
  const crownPx = 0.2 * 1184, chinPx = 0.56 * 1184;
  assert.ok(crownPx > t.crop.sy && chinPx < t.crop.sy + t.crop.sh, "머리가 잘리지 않음");
  assert.equal(evaluateHead(t.achievedRatio, [32 / 45, 36 / 45]).status, "ok");

  // 확대 한계(머리가 이미 크고 위쪽에 붙어 있어 더 못 줄임) → clamped, 달성 비율은 가능한 만큼
  const c = tightCrop(0.0, 0.9, 864, 1184, preset, 0.755);
  assert.equal(c.clamped, true);
  assert.ok(c.achievedRatio > 0.9 && c.crop.sh <= 1184 && c.crop.sw <= 864 && c.crop.sx === 0 && c.crop.sy === 0, "한계까지만 자름");
  // 가로가 좁은 원본: 가로 한계로 clamped
  const n = tightCrop(0.1, 0.3, 200, 1184, preset, 0.755);
  assert.equal(n.clamped, true);
  assert.equal(n.crop.sw, 200);
});

test("확대 자르기: 얼굴이 가로 중앙에서 벗어난 경우 얼굴 중심 기준", async () => {
  const { tightCrop } = await import("../src/lib/portrait/post.ts");
  const preset = { width: 413, height: 531 };
  // 얼굴 중심이 이미지 왼쪽 30% 지점
  const t = tightCrop(0.2, 0.5, 1000, 1000, preset, 0.755, 0.3);
  const faceCenterPx = 300;
  assert.ok(Math.abs(t.crop.sx + t.crop.sw / 2 - faceCenterPx) <= 1 || t.crop.sx === 0, "얼굴 중심이 잘린 영역 중앙(또는 왼쪽 경계)");
  assert.ok(faceCenterPx > t.crop.sx && faceCenterPx < t.crop.sx + t.crop.sw, "얼굴이 영역 안");
  assert.ok(t.crop.sx >= 0 && t.crop.sx + t.crop.sw <= 1000);
  // 기본값(0.5)은 이전과 같다
  const d = tightCrop(0.2, 0.5, 1000, 1000, preset, 0.755);
  assert.ok(Math.abs(d.crop.sx + d.crop.sw / 2 - 500) <= 1);
});

test("자르기 영역 조정 계산·인도네시아 규격", async () => {
  const { cropFromControls, controlsFromCrop, maxHeightFrac, sizePresetById, tightCrop } = await import("../src/lib/portrait/post.ts");
  const ie = sizePresetById("id-evisa");
  assert.ok(ie.width >= 400 && ie.height >= 600 && Math.abs(ie.width / ie.height - 4 / 6) < 0.01, "4×6cm, 최소 400×600");
  assert.deepEqual(ie.headRange, [0.5, 0.6]);
  assert.ok(ie.maxBytes <= 200 * 1024, "공식 안내 간 차이 → 보수적 200KB");
  assert.ok(ie.headSource.includes("evisa.imigrasi.go.id"));

  const aspect = 413 / 531;
  // 정사각 원본에서의 최대 높이 비율: 가로가 한계
  assert.ok(Math.abs(maxHeightFrac(1000, 1000, aspect) - 1) < 1e-9 || maxHeightFrac(1000, 1000, aspect) <= 1);
  assert.ok(Math.abs(maxHeightFrac(300, 1000, aspect) - 300 / aspect / 1000) < 1e-9, "가로가 좁으면 높이 제한");

  const c = cropFromControls({ centerX: 0.5, centerY: 0.5, heightFrac: 0.5 }, 1000, 1000, aspect);
  assert.equal(c.sh, 500);
  assert.ok(Math.abs(c.sw / c.sh - aspect) < 0.01);
  assert.ok(Math.abs(c.sx + c.sw / 2 - 500) <= 1 && Math.abs(c.sy + c.sh / 2 - 500) <= 1);
  // 가장자리로 끌면 원본 안으로 보정
  const e = cropFromControls({ centerX: 0, centerY: 1, heightFrac: 0.5 }, 1000, 1000, aspect);
  assert.equal(e.sx, 0);
  assert.equal(e.sy + e.sh, 1000);
  // 너무 큰 높이는 최대값으로
  const big = cropFromControls({ centerX: 0.5, centerY: 0.5, heightFrac: 5 }, 800, 1200, aspect);
  assert.ok(big.sw <= 800 && big.sh <= 1200);
  // 역변환 왕복
  const t = tightCrop(0.2, 0.56, 864, 1184, { width: 413, height: 531 }, 0.755, 0.45).crop;
  const back = cropFromControls(controlsFromCrop(t, 864, 1184), 864, 1184, 413 / 531);
  for (const k of ["sx", "sy", "sw", "sh"]) assert.ok(Math.abs(back[k] - t[k]) <= 1, `${k} 왕복`);
});

test("조정 값 기억 검증·영역 비례 변환", async () => {
  const { parseStoredControls, scaleCrop, controlsFromCrop } = await import("../src/lib/portrait/post.ts");
  const ok = parseStoredControls(JSON.stringify({ centerX: 0.4, centerY: 0.5, heightFrac: 0.6 }));
  assert.deepEqual(ok, { centerX: 0.4, centerY: 0.5, heightFrac: 0.6 });
  assert.equal(parseStoredControls(null), null);
  assert.equal(parseStoredControls(""), null);
  assert.equal(parseStoredControls("not json"), null);
  assert.equal(parseStoredControls(JSON.stringify({ centerX: 2, centerY: 0.5, heightFrac: 0.6 })), null, "범위 밖");
  assert.equal(parseStoredControls(JSON.stringify({ centerX: 0.5, centerY: 0.5, heightFrac: 0.05 })), null, "너무 작은 높이");
  assert.equal(parseStoredControls(JSON.stringify({ centerX: "0.5", centerY: 0.5, heightFrac: 0.5 })), null, "문자열");
  assert.equal(parseStoredControls(JSON.stringify({ centerX: 0.5, centerY: 0.5 })), null, "누락");

  const crop = { sx: 100, sy: 200, sw: 400, sh: 600 };
  assert.equal(scaleCrop(crop, 864, 1184, 864, 1184), crop, "크기가 같으면 그대로");
  const half = scaleCrop(crop, 864, 1184, 432, 592);
  assert.deepEqual(half, { sx: 50, sy: 100, sw: 200, sh: 300 });
  // 비율 위치는 유지된다
  const a = controlsFromCrop(crop, 864, 1184);
  const b = controlsFromCrop(scaleCrop(crop, 864, 1184, 1728, 2368), 1728, 2368);
  assert.ok(Math.abs(a.centerX - b.centerX) < 0.002 && Math.abs(a.centerY - b.centerY) < 0.002 && Math.abs(a.heightFrac - b.heightFrac) < 0.002);
});

test("일괄 자동 판정·아일랜드 규격", async () => {
  const { decideBatchCrop, sizePresetById } = await import("../src/lib/portrait/post.ts");
  const ie = sizePresetById("ie-passport");
  assert.ok(ie.width >= 715 && ie.height >= 951, "ireland.ie 최소 715×951");
  assert.equal(ie.maxBytes, 9 * 1024 * 1024);
  assert.ok(ie.caution.includes("스캔") && ie.caution.includes("AI"));

  const preset = sizePresetById("passport");
  const W = 864, H = 1184;
  // 머리가 작은 사진 → 확대 자르기 영역이 만들어지고 범위 안으로 들어온다
  const small = decideBatchCrop({ found: true, crownY: 0.2, chinY: 0.56, centerX: 0.5 }, preset, W, H);
  assert.equal(small.status, "small");
  assert.ok(small.crop && small.achieved > 0.7 && small.achieved < 0.82);
  assert.ok(small.ratio < 0.45);
  // 범위 안 → 영역 없음
  const ok = decideBatchCrop({ found: true, crownY: 0.02, chinY: 0.7, centerX: 0.5 }, preset, W, H);
  assert.equal(ok.status, "ok");
  assert.equal(ok.crop, undefined);
  // 크게 → 영역 없음
  const large = decideBatchCrop({ found: true, crownY: 0.01, chinY: 0.97, centerX: 0.5 }, preset, W, H);
  assert.equal(large.status, "large");
  assert.equal(large.crop, undefined);
  // 얼굴 못 찾음·검사 실패·범위 없는 규격
  assert.equal(decideBatchCrop({ found: false, crownY: 0, chinY: 0 }, preset, W, H).status, "notfound");
  assert.equal(decideBatchCrop(null, preset, W, H).status, "notfound");
  assert.equal(decideBatchCrop({ found: true, crownY: 0.2, chinY: 0.5 }, sizePresetById("resume"), W, H).status, "notfound");
  // 얼굴 중심이 한쪽으로 치우친 경우 그 위치 기준으로 자른다
  const off = decideBatchCrop({ found: true, crownY: 0.2, chinY: 0.5, centerX: 0.3 }, preset, 1000, 1000);
  assert.ok(Math.abs(off.crop.sx + off.crop.sw / 2 - 300) <= 1 || off.crop.sx === 0);
});

test("얼굴 중앙 맞춤 옵션·호주 규격", async () => {
  const { centerFaceCrop, decideBatchCrop, sizePresetById, coverCrop } = await import("../src/lib/portrait/post.ts");
  const au = sizePresetById("au-citizenship");
  assert.deepEqual([au.width, au.height], [1200, 1600], "immi.homeaffairs.gov.au 선호 해상도");
  assert.deepEqual([au.minBytes, au.maxBytes], [70 * 1024, Math.round(3.5 * 1024 * 1024)]);
  assert.ok(au.headRange[0] < au.headRange[1] && au.headSource.includes("immi.homeaffairs.gov.au"));

  const preset = { width: 413, height: 531 };
  // 크기는 기본 자르기와 같고 얼굴이 가로 중앙으로
  const base = coverCrop(2000, 1000, 413, 531, 0.15);
  const c = centerFaceCrop(0.3, 2000, 1000, preset);
  assert.equal(c.sw, base.sw);
  assert.equal(c.sh, base.sh);
  assert.equal(c.sy, base.sy);
  assert.ok(Math.abs(c.sx + c.sw / 2 - 600) <= 1 || c.sx === 0);
  // 가장자리 얼굴도 원본 안으로
  const e = centerFaceCrop(0.99, 2000, 1000, preset);
  assert.ok(e.sx + e.sw <= 2000 && e.sx >= 0);

  const kr = sizePresetById("passport");
  const m = { found: true, crownY: 0.02, chinY: 0.78, centerX: 0.3 };
  const off = decideBatchCrop(m, kr, 1000, 1000, false);
  assert.equal(off.crop, undefined, "옵션 끄면 범위 안은 영역 없음");
  const on = decideBatchCrop(m, kr, 1000, 1000, true);
  assert.ok(on.crop, "옵션 켜면 중앙 맞춤 영역");
  assert.equal(on.status, off.status, "판정 상태는 같다");
  assert.equal(on.status, "ok");
  // 작은 머리는 옵션과 상관없이 확대 자르기
  const small = decideBatchCrop({ found: true, crownY: 0.2, chinY: 0.5, centerX: 0.5 }, kr, 1000, 1000, true);
  assert.equal(small.status, "small");
  assert.ok(small.achieved > 0.7);
});

test("직접 지정 두 점 → 측정값·폴란드 규격", async () => {
  const { marksToMeasure, sizePresetById, tightCrop, headInCrop, evaluateHead } = await import("../src/lib/portrait/post.ts");
  const pl = sizePresetById("pl-id");
  assert.ok(pl.width >= 492 && pl.height >= 633 && Math.abs(pl.width / pl.height - 35 / 45) < 0.01, "gov.pl 492×633, 35:45 비율");
  assert.equal(pl.maxBytes, Math.round(2.5 * 1024 * 1024));
  assert.deepEqual(pl.headRange, [0.7, 0.8]);
  assert.ok(pl.caution.includes("신분증"));

  // 순서 무관: 위쪽 점이 정수리
  const a = marksToMeasure({ x: 0.4, y: 0.7 }, { x: 0.6, y: 0.2 });
  assert.deepEqual(a, { crownY: 0.2, chinY: 0.7, centerX: 0.5 });
  const b = marksToMeasure({ x: 0.3, y: 0.2 }, { x: 0.3, y: 0.7 });
  assert.equal(b.centerX, 0.3);
  // 너무 가까우면 거부
  assert.equal(marksToMeasure({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.53 }), null);
  // 범위를 벗어난 좌표는 0~1로 보정
  const c = marksToMeasure({ x: -0.2, y: -0.1 }, { x: 1.4, y: 0.6 });
  assert.deepEqual(c, { crownY: 0, chinY: 0.6, centerX: 0.6 });

  // 수동 지정 → 확대 자르기 → 공식 범위 안
  const kr = sizePresetById("passport");
  const m = marksToMeasure({ x: 0.35, y: 0.22 }, { x: 0.35, y: 0.5 });
  const cur = headInCrop(m.crownY, m.chinY, 864, 1184, kr).ratio;
  assert.ok(cur < 0.4);
  const t = tightCrop(m.crownY, m.chinY, 864, 1184, kr, (kr.headRange[0] + kr.headRange[1]) / 2, m.centerX);
  assert.equal(evaluateHead(t.achievedRatio, kr.headRange).status, "ok");
  assert.ok(Math.abs(t.crop.sx + t.crop.sw / 2 - 0.35 * 864) <= 1 || t.crop.sx === 0, "지정한 가로 중심");
});
