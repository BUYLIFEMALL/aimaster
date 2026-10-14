import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { mergeByHeader, safeFileName, safeSheetName, splitByColumn, splitByRows, stem, toTable, uniqueHeaders, SOURCE_FILE } from "../src/lib/files/table.ts";
import { decodeText, joinTexts, parseSeparator, sentences, splitByChars, splitBySentences, splitIntoParts } from "../src/lib/files/text.ts";
import { readSheets, writeCsv, writeXlsx } from "../src/lib/files/sheetio.ts";
import { createZip } from "../src/lib/files/zip.ts";

const xlsxBytes = (sheets) => {
  const wb = XLSX.utils.book_new();
  for (const [n, aoa] of sheets) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n);
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
};

test("원본 결함 재현 사례: 머리글 반복·열 어긋남이 생기지 않는다", () => {
  // 원본 앱은 [이름,매출,지역] 뒤에 [지역,이름,매출] 머리글 행이 다시 들어가고 '대구'가 이름 열로 갔다
  const a = toTable("1월.xlsx", "1월", [["이름", "매출", "지역"], ["김철수", 100, "서울"], ["이영희", 200, "부산"]]);
  const b = toTable("2월.xlsx", "2월", [["지역", "이름", "매출 "], ["대구", "박민수", 300]]);
  const m = mergeByHeader([a, b]);
  assert.deepEqual(m.header, ["이름", "매출", "지역"]);
  assert.deepEqual(m.rows, [["김철수", 100, "서울"], ["이영희", 200, "부산"], ["박민수", 300, "대구"]]);
  const s = mergeByHeader([a, b], { addSource: true });
  assert.equal(s.header[0], SOURCE_FILE); assert.deepEqual(s.rows[2].slice(0, 2), ["2월.xlsx", "2월"]);
  const c = toTable("3월.xlsx", "3월", [["이름", "비고"], ["최", "신규"]]);
  assert.deepEqual(mergeByHeader([a, c]).header, ["이름", "매출", "지역", "비고"]);
  assert.deepEqual(mergeByHeader([a, c]).rows[2], ["최", null, null, "신규"]);
});

test("머리글 행·빈 줄·중복 머리글", () => {
  const t = toTable("f", "s", [["보고서 제목"], ["이름", "", "이름"], ["가", 1, "x"], [null, null], ["나", 2, "y"]], 2);
  assert.deepEqual(t.header, ["이름", "열2", "이름 (2)"]); assert.equal(t.rows.length, 2, "빈 줄 제외");
  assert.deepEqual(toTable("f", "s", [["a", "b"]], 0).header, ["열1", "열2"]);
  assert.deepEqual(uniqueHeaders([" 매출 ", "매출"]), ["매출", "매출 (2)"]);
});

test("나누기: 열 값별·N행씩", () => {
  const t = { header: ["지역", "값"], rows: [["서울", 1], ["부산", 2], ["서울", 3], ["", 4], [null, 5]] };
  const g = splitByColumn(t, 0);
  assert.deepEqual(g.map((x) => [x.key, x.rows.length]), [["서울", 2], ["부산", 1], ["(빈 값)", 2]]);
  assert.deepEqual(splitByRows([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(splitByRows([1], 0), [[1]]);
});

test("시트·파일 이름 정리", () => {
  const used = new Set();
  assert.equal(safeSheetName("매출/2026:1월*", used), "매출_2026_1월_");
  assert.equal(safeSheetName("매출/2026:1월*", used), "매출_2026_1월__2");
  const long = "가".repeat(40);
  assert.equal(safeSheetName(long, used).length, 31); assert.equal(safeSheetName(long, used).length, 31);
  const fu = new Set();
  assert.equal(safeFileName('a<b>:c?', fu), "a_b__c_"); assert.equal(safeFileName("a<b>:c?", fu), "a_b__c_ (2)");
  assert.equal(stem("보고서.final.xlsx"), "보고서.final");
});

test("텍스트 인코딩: UTF-8·BOM·한국어 ANSI(CP949) 자동 인식", () => {
  const utf = new TextEncoder().encode("안녕하세요");
  assert.deepEqual(decodeText(utf), { text: "안녕하세요", encoding: "utf-8" });
  assert.equal(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, ...utf])).text, "안녕하세요");
  const cp949 = new Uint8Array([0xbe, 0xc8, 0xb3, 0xe7]); // "안녕"
  assert.deepEqual(decodeText(cp949), { text: "안녕", encoding: "euc-kr" });
});

test("텍스트 합치기", () => {
  assert.equal(parseSeparator("\\n---\\n"), "\n---\n");
  assert.equal(joinTexts([{ name: "a.txt", text: "가\r\n나\n\n" }, { name: "b.txt", text: "다" }], { separator: "\n\n", withName: true }), "[a.txt]\n가\n나\n\n[b.txt]\n다");
});

test("텍스트 나누기: 글자 수 기준은 경계를 지키고 원문을 보존한다", () => {
  const para = "첫 문단의 문장입니다. 두 번째 문장입니다.\n\n" + "둘째 문단은 마침표 없이 아주 길게 이어지는 문장 ".repeat(12) + "\n\n셋째 문단입니다.";
  const parts = splitByChars(para, 200);
  assert.equal(parts.join(""), para, "이어 붙이면 원문");
  assert.ok(parts.every((p) => p.length <= 200));
  assert.ok(parts.slice(0, -1).every((p) => /[\s.]$/.test(p)), "띄어쓰기·문장·문단 경계에서 끊음");
  const word = "가".repeat(500);
  assert.deepEqual(splitByChars(word, 200).map((p) => p.length), [200, 200, 100], "경계가 없으면 그대로 자름");
  const four = splitIntoParts("가나다 ".repeat(100), 4);
  assert.ok(four.length >= 3 && four.length <= 5);
});

test("텍스트 나누기: 문장 수 기준은 고르게, 빈 조각 없이", () => {
  // 원본 앱은 6문장을 3조각으로 나눌 때 마침표 없는 긴 문장을 통째로 넣었다 — 여기서는 문장 수가 2·2·2로 고르다
  const t = "첫 문장입니다. 둘째 문장\n셋째 줄! 넷째 줄? 다섯째 문장. 여섯째 문장.";
  const s = sentences(t);
  assert.equal(s.join(""), t);
  const p = splitBySentences(t, 3);
  assert.equal(p.length, 3); assert.equal(p.join(""), t);
  assert.equal(splitBySentences("한 문장.", 5).length, 1, "문장보다 많은 조각은 만들지 않음");
});

test("엑셀·CSV 읽기/쓰기 왕복", () => {
  const bytes = xlsxBytes([["1월", [["이름", "매출"], ["김", 100]]], ["빈시트", []]]);
  const sheets = readSheets(bytes, "a.xlsx");
  assert.deepEqual(sheets.map((s) => s.name), ["1월", "빈시트"]);
  assert.deepEqual(sheets[0].aoa, [["이름", "매출"], ["김", 100]]);
  const out = writeXlsx([{ name: "합친 결과", header: ["이름", "매출"], rows: [["김", 100]] }]);
  assert.deepEqual(readSheets(out, "o.xlsx")[0].aoa, [["이름", "매출"], ["김", 100]]);
  const csv = writeCsv(["이름", "메모"], [["김", "쉼표, 포함"]]);
  assert.deepEqual([...csv.slice(0, 3)], [0xef, 0xbb, 0xbf], "엑셀 한글용 BOM");
  assert.deepEqual(readSheets(csv, "x.csv")[0].aoa, [["이름", "메모"], ["김", "쉼표, 포함"]]);
  const ansiCsv = new Uint8Array([0xc0, 0xcc, 0xb8, 0xa7, 0x2c, 0x61, 0x0a, 0xb1, 0xe8, 0x2c, 0x31]); // "이름,a\n김,1" (CP949)
  assert.deepEqual(readSheets(ansiCsv, "ansi.csv")[0].aoa, [["이름", "a"], ["김", 1]]);
});

test("ZIP 생성", () => {
  const z = createZip([{ name: "가.xlsx", data: new Uint8Array([1, 2]) }]);
  assert.equal(new DataView(z.buffer).getUint32(0, true), 0x04034b50);
});

test("아주 많은 행(30만 행)에서도 스택이 넘치지 않는다", () => {
  const aoa = [["a", "b"], ...Array.from({ length: 300000 }, (_, i) => [i, "x"])];
  const t = toTable("f", "s", aoa, 1);
  assert.equal(t.rows.length, 300000); assert.deepEqual(t.header, ["a", "b"]);
  assert.equal(mergeByHeader([t, t]).rows.length, 600000);
});
