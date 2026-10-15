import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { handle, MAX_SPLIT_FILES } from "../src/lib/files/sheetStore.ts";
import { readSheets } from "../src/lib/files/sheetio.ts";

const xlsx = (sheets) => {
  const wb = XLSX.utils.book_new();
  for (const [n, aoa] of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n);
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" })).buffer;
};
// 파일을 ZIP에서 꺼내 읽는 대신, 저장 바이트를 다시 읽어 확인한다
const reread = (bytes, name = "o.xlsx") => readSheets(bytes, name)[0].aoa;

test("보관소: 불러오기 → 미리보기(20행 제한·전체 수) → 합쳐 저장", () => {
  const big = [["이름", "값"], ...Array.from({ length: 50 }, (_, i) => ["n" + i, i])];
  const meta = handle({ op: "load", fileId: "a", name: "a.xlsx", bytes: xlsx([["S", big]]), enc: "auto" });
  assert.deepEqual(meta, [{ name: "S", rows: 51 }]);
  handle({ op: "load", fileId: "b", name: "b.xlsx", bytes: xlsx([["T", [["값", "이름"], [99, "끝"]]]]), enc: "auto" });
  const picks = [{ fileId: "a", fileName: "a.xlsx", sheet: 0 }, { fileId: "b", fileName: "b.xlsx", sheet: 0 }];
  const p = handle({ op: "mergePreview", picks, headerRow: 1, addSource: false, shape: { cols: null, dedupe: false }, limit: 20 });
  assert.equal(p.rows.length, 20); assert.equal(p.total, 51); assert.deepEqual(p.header, ["이름", "값"]);
  const w = handle({ op: "mergeWrite", picks, headerRow: 1, addSource: true, shape: { cols: null, dedupe: false }, format: "xlsx" });
  const aoa = reread(w.bytes);
  assert.equal(w.rows, 51); assert.deepEqual(aoa[51], ["b.xlsx", "T", "끝", 99], "열 순서가 다른 파일도 제 열로");
  const c = handle({ op: "collectWrite", picks });
  assert.deepEqual(readSheets(c.bytes, "c.xlsx").map((s) => s.name), ["a_S", "b_T"]);
  handle({ op: "drop", fileId: "a" });
  assert.throws(() => handle({ op: "mergePreview", picks, headerRow: 1, addSource: false, shape: { cols: null, dedupe: false }, limit: 20 }), /다시 올려/);
});

test("보관소: 나누기 계획·저장(ZIP)과 개수 제한", () => {
  const rows = [["지역", "값"], ["서울", 1], ["부산", 2], ["서울", 3]];
  handle({ op: "load", fileId: "s", name: "고객.xlsx", bytes: xlsx([["A", rows], ["B", [["x"], [1]]]]), enc: "auto" });
  const o = { fileId: "s", fileName: "고객.xlsx", mode: "column", sheet: 0, headerRow: 1, col: 0, rowsPer: 1 };
  assert.deepEqual(handle({ op: "splitPlan", opts: o }).outs, [{ name: "고객_서울.xlsx", rows: 2 }, { name: "고객_부산.xlsx", rows: 1 }]);
  assert.equal(handle({ op: "splitPlan", opts: { ...o, mode: "sheets" } }).outs.length, 2);
  assert.deepEqual(handle({ op: "splitPlan", opts: { ...o, mode: "rows", rowsPer: 2 } }).outs.map((x) => x.name), ["고객_01.xlsx", "고객_02.xlsx"]);
  const z = handle({ op: "splitWrite", opts: o });
  assert.equal(z.count, 2); assert.equal(new DataView(z.bytes.buffer).getUint32(0, true), 0x04034b50);
  const many = [["k"], ...Array.from({ length: MAX_SPLIT_FILES + 1 }, (_, i) => ["v" + i])];
  handle({ op: "load", fileId: "m", name: "m.xlsx", bytes: xlsx([["A", many]]), enc: "auto" });
  assert.throws(() => handle({ op: "splitWrite", opts: { ...o, fileId: "m", fileName: "m.xlsx" } }), /너무 많습니다/);
});

test("보관소 v1.03: 열 고르기·순서 + 같은 행 제거가 미리보기·저장에 함께 적용", () => {
  handle({ op: "load", fileId: "d1", name: "d1.xlsx", bytes: xlsx([["S", [["이름", "값", "메모"], ["가", 1, "x"], ["나", 2, "y"]]]]), enc: "auto" });
  handle({ op: "load", fileId: "d2", name: "d2.xlsx", bytes: xlsx([["S", [["값", "이름", "메모"], [1, "가", "다름"], [3, "다", "z"]]]]), enc: "auto" });
  const picks = [{ fileId: "d1", fileName: "d1.xlsx", sheet: 0 }, { fileId: "d2", fileName: "d2.xlsx", sheet: 0 }];
  const shape = { cols: ["값", "이름"], dedupe: true };
  const p = handle({ op: "mergePreview", picks, headerRow: 1, addSource: true, shape, limit: 20 });
  assert.deepEqual(p.allHeader, ["원본 파일", "원본 시트", "이름", "값", "메모"]);
  assert.deepEqual(p.header, ["값", "이름"]);
  assert.equal(p.total, 3); assert.equal(p.removed, 1, "메모 열을 뺐으므로 (1,가)가 같은 행");
  const w = handle({ op: "mergeWrite", picks, headerRow: 1, addSource: true, shape, format: "csv" });
  assert.equal(w.rows, 3); assert.equal(w.cols, 2); assert.equal(w.removed, 1);
  const k = handle({ op: "mergePreview", picks, headerRow: 1, addSource: true, shape: { cols: null, dedupe: true }, limit: 20 });
  assert.equal(k.removed, 0, "메모까지 비교하면 같은 행 없음");
});
