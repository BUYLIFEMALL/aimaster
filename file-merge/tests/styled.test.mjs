// v1.04 원본 서식 유지 저장(ExcelJS)
import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import { handle } from "../src/lib/files/sheetStore.ts";
import { readSheets } from "../src/lib/files/sheetio.ts";

const RED = "FFFF0000", BLUE = "FF0000FF";
async function book(build) { const wb = new ExcelJS.Workbook(); build(wb); return new Uint8Array(await wb.xlsx.writeBuffer()); }
const ab = (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

test("readSheets: 앞쪽 빈 줄·빈 열이 있어도 원본 행·열 번호를 기억", async () => {
  const bytes = await book((wb) => { const ws = wb.addWorksheet("S"); ws.getCell("C3").value = "이름"; ws.getCell("C5").value = "가"; });
  const [s] = readSheets(bytes, "a.xlsx");
  assert.deepEqual(s.aoa, [["이름"], ["가"]]);
  assert.deepEqual(s.rowNums, [2, 4]); assert.equal(s.col0, 2);
});

test("이어 붙이기 서식 유지: 머리글은 처음 파일, 데이터는 각자 원본 서식·표시 형식·열 너비", async () => {
  const a = await book((wb) => {
    const ws = wb.addWorksheet("매출");
    ws.addRow(["이름", "금액"]); ws.addRow(["가", 1000]); ws.addRow([]); ws.addRow(["나", 2000]);
    ws.getRow(1).font = { bold: true }; ws.getCell("A1").fill = fill(BLUE); ws.getColumn(2).width = 30;
    ws.getCell("B2").numFmt = "#,##0원"; ws.getCell("A4").fill = fill(RED);
  });
  const b = await book((wb) => { const ws = wb.addWorksheet("매출"); ws.addRow(["금액", "이름"]); ws.addRow([3000, "다"]); ws.getCell("B2").font = { italic: true }; });
  handle({ op: "load", fileId: "sa", name: "a.xlsx", bytes: ab(a), enc: "auto" });
  handle({ op: "load", fileId: "sb", name: "b.xlsx", bytes: ab(b), enc: "auto" });
  const picks = [{ fileId: "sa", fileName: "a.xlsx", sheet: 0 }, { fileId: "sb", fileName: "b.xlsx", sheet: 0 }];
  const r = await handle({ op: "mergeWrite", picks, headerRow: 1, addSource: true, shape: { cols: ["이름", "금액"], dedupe: false }, format: "xlsx", style: { sa: ab(a), sb: ab(b) } });
  assert.equal(r.rows, 3); assert.equal(r.cols, 2);
  const out = new ExcelJS.Workbook(); await out.xlsx.load(r.bytes); const ws = out.worksheets[0];
  assert.deepEqual([ws.getCell("A1").value, ws.getCell("B1").value], ["이름", "금액"]);
  assert.equal(ws.getCell("A1").font?.bold, true); assert.equal(ws.getCell("A1").fill?.fgColor?.argb, BLUE);
  assert.equal(ws.getColumn(2).width, 30, "열 너비는 처음 파일");
  assert.equal(ws.getCell("B2").value, 1000); assert.equal(ws.getCell("B2").numFmt, "#,##0원");
  assert.equal(ws.getCell("A3").value, "나"); assert.equal(ws.getCell("A3").fill?.fgColor?.argb, RED, "빈 줄 아래 행도 제 원본 셀 서식");
  assert.equal(ws.getCell("A4").value, "다"); assert.equal(ws.getCell("A4").font?.italic, true, "열 순서가 다른 파일도 제 셀 서식");
});

test("시트별로 모으기 서식 유지: 시트 내용·서식·병합 그대로", async () => {
  const a = await book((wb) => { const ws = wb.addWorksheet("표지"); ws.getCell("A1").value = "제목"; ws.mergeCells("A1:C1"); ws.getCell("A1").fill = fill(RED); ws.getColumn(1).width = 25; });
  handle({ op: "load", fileId: "c1", name: "보고서.xlsx", bytes: ab(a), enc: "auto" });
  const r = await handle({ op: "collectWrite", picks: [{ fileId: "c1", fileName: "보고서.xlsx", sheet: 0 }], style: { c1: ab(a) } });
  const out = new ExcelJS.Workbook(); await out.xlsx.load(r.bytes); const ws = out.worksheets[0];
  assert.equal(ws.name, "보고서_표지"); assert.equal(ws.getCell("A1").value, "제목");
  assert.equal(ws.getCell("A1").fill?.fgColor?.argb, RED); assert.equal(ws.getColumn(1).width, 25);
  assert.ok(ws.getCell("B1").isMerged, "병합 유지");
});

test("서식 유지 한도: 100만 칸을 넘으면 안내 오류", async () => {
  const { MAX_STYLE_CELLS } = await import("../src/lib/files/sheetStore.ts");
  assert.equal(MAX_STYLE_CELLS, 1_000_000);
  const rows = Array.from({ length: 1001 }, (_, i) => Array.from({ length: 1000 }, () => i));
  const wb = new ExcelJS.Workbook(); wb.addWorksheet("S").addRows([Array.from({ length: 1000 }, (_, i) => "c" + i), ...rows.slice(0, 1)]);
  const small = new Uint8Array(await wb.xlsx.writeBuffer());
  // 작은 원본으로 보관소를 채운 뒤 행만 크게 만든 시트를 직접 넣기 어렵기 때문에, 한도 함수 경로를 collectWrite로 확인
  const XLSX = await import("xlsx");
  const big = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(big, XLSX.utils.aoa_to_sheet(rows), "B");
  const bytes = new Uint8Array(XLSX.write(big, { type: "array", bookType: "xlsx" }));
  handle({ op: "load", fileId: "big", name: "big.xlsx", bytes: ab(bytes), enc: "auto" });
  assert.throws(() => handle({ op: "collectWrite", picks: [{ fileId: "big", fileName: "big.xlsx", sheet: 0 }], style: { big: ab(small) } }), /원본 서식 유지/);
});

// v1.05 엑셀 나누기 서식 유지
async function unzipBooks(zipBytes) {
  const JSZip = (await import("jszip")).default;
  const z = await JSZip.loadAsync(zipBytes);
  const out = {};
  for (const name of Object.keys(z.files).sort()) { const wb = new ExcelJS.Workbook(); await wb.xlsx.load(await z.files[name].async("uint8array")); out[name] = wb.worksheets[0]; }
  return out;
}

test("나누기 서식 유지: 열 값별·N행씩·시트별 모두 원본 셀 서식·열 너비", async () => {
  const src = await book((wb) => {
    const ws = wb.addWorksheet("고객");
    ws.addRow(["지역", "이름", "금액"]); ws.addRow(["서울", "가", 1000]); ws.addRow([]); ws.addRow(["부산", "나", 2000]); ws.addRow(["서울", "다", 3000]);
    ws.getRow(1).font = { bold: true }; ws.getCell("A1").fill = fill(BLUE); ws.getColumn(3).width = 22; ws.getColumn(3).numFmt = "#,##0원";
    ws.getCell("B4").fill = fill(RED); ws.getCell("B5").font = { italic: true };
    wb.addWorksheet("요약").getCell("A1").value = "합계";
    wb.getWorksheet("요약").getCell("A1").fill = fill(RED);
  });
  handle({ op: "load", fileId: "sp", name: "고객.xlsx", bytes: ab(src), enc: "auto" });
  const base = { fileId: "sp", fileName: "고객.xlsx", sheet: 0, headerRow: 1, col: 0, rowsPer: 2 };
  const byCol = await unzipBooks((await handle({ op: "splitWrite", opts: { ...base, mode: "column" }, style: ab(src) })).bytes);
  const seoul = byCol["고객_서울.xlsx"], busan = byCol["고객_부산.xlsx"];
  assert.equal(seoul.getCell("A1").fill?.fgColor?.argb, BLUE); assert.equal(seoul.getCell("A1").font?.bold, true); assert.equal(seoul.getColumn(3).width, 22);
  assert.deepEqual([seoul.getCell("B2").value, seoul.getCell("B3").value], ["가", "다"]);
  assert.equal(seoul.getCell("B3").font?.italic, true, "빈 줄 뒤 행도 제 원본 서식"); assert.equal(seoul.getCell("C2").numFmt, "#,##0원");
  assert.equal(busan.getCell("B2").fill?.fgColor?.argb, RED);
  const byRows = await unzipBooks((await handle({ op: "splitWrite", opts: { ...base, mode: "rows" }, style: ab(src) })).bytes);
  assert.equal(byRows["고객_02.xlsx"].getCell("B2").font?.italic, true);
  const bySheet = await unzipBooks((await handle({ op: "splitWrite", opts: { ...base, mode: "sheets" }, style: ab(src) })).bytes);
  assert.equal(bySheet["고객_요약.xlsx"].getCell("A1").fill?.fgColor?.argb, RED);
  assert.equal(bySheet["고객_고객.xlsx"].getColumn(3).width, 22);
});
