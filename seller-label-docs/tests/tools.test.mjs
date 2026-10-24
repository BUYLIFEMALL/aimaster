import test from "node:test";
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import { SHEET_PRESETS, cellRects, validateSheet, assignToPages, fillTemplate, centeredSheet, totalCells } from "../src/lib/label/layout.ts";
import { ean13CheckDigit, checkCodeValue } from "../src/lib/label/barcode.ts";
import { contrastRatio, judgeQrContrast } from "../src/lib/qr/contrast.ts";
import { buildNames, moveItem, sanitizeBase } from "../src/lib/rename.ts";
import { parsePageRange, mergePdfs, pickPages, splitEvery, pageCountOf, toPdfBox, stampPng } from "../src/lib/pdf/ops.ts";

// ── 라벨 배치 ──
test("모든 기본 규격은 A4 안에 들어간다", () => {
  for (const s of SHEET_PRESETS) assert.deepEqual(validateSheet(s), [], s.name);
});

test("21칸 63.5×38.1 가운데 정렬 여백 계산", () => {
  const s = SHEET_PRESETS.find((p) => p.id === "a4-21");
  assert.equal(s.marginLeft, 7.25);
  assert.equal(s.marginTop, 15.15);
  const rects = cellRects(s);
  assert.equal(rects.length, 21);
  assert.deepEqual(rects[1], { index: 1, x: 73.25, y: 15.15, w: 63.5, h: 38.1 });
  assert.equal(rects[3].y, 53.25); // 둘째 줄
});

test("인쇄 위치 보정값이 모든 칸에 더해진다", () => {
  const s = centeredSheet("t", "t", 2, 2, 50, 50, 10, 10);
  const a = cellRects(s);
  const b = cellRects(s, { dx: 1.5, dy: -2 });
  assert.equal(b[3].x, a[3].x + 1.5);
  assert.equal(b[3].y, a[3].y - 2);
});

test("종이를 벗어나는 규격은 오류", () => {
  const s = { ...centeredSheet("t", "t", 2, 2, 100, 100), marginLeft: 20 };
  assert.match(validateSheet(s).join(), /오른쪽/);
  assert.match(validateSheet({ ...s, cols: 0 }).join(), /가로 칸 수/);
});

test("시작 칸·반복 수로 페이지를 나눈다", () => {
  const pages = assignToPages(4, ["a", "b", "c"], 2, 2);
  assert.equal(pages.length, 2);
  assert.deepEqual(pages[0], [null, null, "a", "a"]);
  assert.deepEqual(pages[1], ["b", "b", "c", "c"]);
  assert.deepEqual(assignToPages(4, [], 0), []);
  assert.equal(totalCells(SHEET_PRESETS.find((p) => p.id === "a4-65")), 65);
});

test("{열 이름}을 엑셀 값으로 채운다", () => {
  assert.equal(fillTemplate("{상품명} / {가격}원 {없음}", { 상품명: "사과", 가격: 3000 }), "사과 / 3000원 ");
});

// ── 바코드 ──
test("EAN-13 검증 숫자", () => {
  assert.equal(ean13CheckDigit("400638133393"), 1);
  assert.equal(checkCodeValue("ean13", "4006381333931"), null);
  assert.match(checkCodeValue("ean13", "4006381333930"), /계산값 1/);
  assert.match(checkCodeValue("ean13", "88012"), /12자리/);
  assert.match(checkCodeValue("code128", "한글"), /한글 불가/);
  assert.equal(checkCodeValue("qrcode", "https://예시.kr"), null);
  assert.equal(checkCodeValue("none", ""), null);
});

// ── QR 대비 ──
test("QR 대비 판정", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21);
  assert.equal(judgeQrContrast("#000000", "#ffffff").level, "good");
  assert.equal(judgeQrContrast("#ffffff", "#000000").level, "bad"); // 반전
  assert.equal(judgeQrContrast("#bbbbbb", "#ffffff").level, "bad");
});

// ── 파일명 ──
test("공통 이름 + 순번", () => {
  const names = buildNames(["a.JPG", "b.png", "c"], { base: "사과/세트", start: 9, digits: 3, separator: "_", position: "after", lowerExt: true });
  assert.deepEqual(names, ["사과세트_009.jpg", "사과세트_010.png", "사과세트_011"]);
  assert.deepEqual(buildNames(["x.jpg"], { base: "", start: 1, digits: 2, separator: "-", position: "before", lowerExt: false }), ["01.jpg"]);
  assert.deepEqual(moveItem([1, 2, 3], 2, 0), [3, 1, 2]);
  assert.equal(sanitizeBase('  a:b*"c  '), "abc");
});

// ── PDF ──
async function makePdf(n) {
  const d = await PDFDocument.create();
  for (let i = 0; i < n; i += 1) d.addPage([100 + i, 200]);
  return d.save();
}

test("페이지 범위 읽기", () => {
  assert.deepEqual(parsePageRange("1-3, 5, 8-", 9), [0, 1, 2, 4, 7, 8]);
  assert.deepEqual(parsePageRange("3-1 2", 5), [0, 1, 2]);
  assert.throws(() => parsePageRange("가", 3), /읽을 수 없습니다/);
});

test("합치기·뽑기·나누기 페이지 수", async () => {
  const a = await makePdf(2);
  const b = await makePdf(3);
  const merged = await mergePdfs([a, b]);
  assert.equal(await pageCountOf(merged), 5);
  const picked = await pickPages(merged, [4, 0]);
  const pd = await PDFDocument.load(picked);
  assert.equal(pd.getPageCount(), 2);
  assert.equal(Math.round(pd.getPage(0).getWidth()), 102); // 순서가 바뀌었는지
  const parts = await splitEvery(merged, 2);
  assert.deepEqual(await Promise.all(parts.map(pageCountOf)), [2, 2, 1]);
});

test("서명 위치를 PDF 좌표로 바꾸고 찍는다", async () => {
  assert.deepEqual(toPdfBox({ x: 0.5, y: 0.1, w: 0.25, h: 0.1 }, { width: 200, height: 400 }), { x: 100, y: 320, width: 50, height: 40 });
  // 1×1 투명 PNG
  const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64"));
  const out = await stampPng(await makePdf(3), png, { x: 0.1, y: 0.1, w: 0.2, h: 0.1 });
  assert.equal(await pageCountOf(out), 3);
});
