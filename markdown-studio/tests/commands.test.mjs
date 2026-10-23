import test from "node:test";
import assert from "node:assert/strict";
import * as c from "../src/lib/editor/commands.ts";

const S = (a, b = a) => ({ from: a, to: b });
const all = t => S(0, t.length);

test("기호는 원본과 같은 32개", () => {
  assert.equal(c.SYMBOLS.length, 32);
  assert.equal(new Set(c.SYMBOLS).size, 32);
});

test("제목: 여러 줄 적용, 같은 단계 재선택 시 해제, 다른 단계는 교체", () => {
  const t = "첫째\n둘째\n\n셋째";
  const r = c.toggleHeading(t, all(t), 2);
  assert.equal(r.text, "## 첫째\n## 둘째\n\n## 셋째");
  assert.equal(c.toggleHeading(r.text, all(r.text), 2).text, t);
  assert.equal(c.toggleHeading(r.text, all(r.text), 1).text, "# 첫째\n# 둘째\n\n# 셋째");
  assert.equal(c.toggleHeading("안녕", S(1), 3).text, "### 안녕");
});

test("굵게·기울임·취소선: 감싸기, 해제, 빈 선택, 굵게 안의 기울임", () => {
  assert.equal(c.toggleWrap("한글 텍스트", S(0, 2), "**").text, "**한글** 텍스트");
  const r = c.toggleWrap("한글 텍스트", S(0, 2), "**");
  assert.equal(c.toggleWrap(r.text, r.sel, "**").text, "한글 텍스트"); // 바깥 표식 해제
  const e = c.toggleWrap("abc", S(1), "~~");
  assert.equal(e.text, "a~~~~bc");
  assert.equal(e.sel.from, 3);
  const b = c.toggleWrap("x", S(0, 1), "**");
  const i = c.toggleWrap(b.text, b.sel, "*");
  assert.equal(i.text, "***x***"); // 굵게 위에 기울임 추가, 해제로 오인하지 않음
  assert.equal(c.toggleWrap("*가*", S(0, 3), "*").text, "가");
});

test("목록 3종 + 체크리스트: 적용·해제·교체, 번호 증가", () => {
  const t = "가\n나\n다";
  assert.equal(c.setList(t, all(t), "bullet").text, "- 가\n- 나\n- 다");
  assert.equal(c.setList(t, all(t), "number").text, "1. 가\n2. 나\n3. 다");
  assert.equal(c.setList(t, all(t), "alpha").text, "a. 가\nb. 나\nc. 다");
  assert.equal(c.setList(t, all(t), "task").text, "- [ ] 가\n- [ ] 나\n- [ ] 다");
  const n = c.setList(t, all(t), "number").text;
  assert.equal(c.setList(n, all(n), "number").text, t); // 같은 종류 = 해제
  assert.equal(c.setList(n, all(n), "bullet").text, "- 가\n- 나\n- 다"); // 종류 교체
  const nested = "  하위";
  assert.equal(c.setList(nested, S(0), "bullet").text, "  - 하위");
});

test("들여쓰기·내어쓰기·인용 토글", () => {
  const t = "가\n\n나";
  const ind = c.indentLines(t, all(t));
  assert.equal(ind.text, "  가\n\n  나");
  assert.equal(c.outdentLines(ind.text, all(ind.text)).text, t);
  assert.equal(c.outdentLines("가", S(0)).text, "가");
  const q = c.toggleQuote(t, all(t));
  assert.equal(q.text, "> 가\n\n> 나");
  assert.equal(c.toggleQuote(q.text, all(q.text)).text, t);
});

test("링크·이미지: 안전한 주소만 허용", () => {
  const l = c.insertLink("보기", S(0, 2), "https://example.com/a(b)");
  assert.equal(l.text, "[보기](https://example.com/a%28b%29)");
  assert.equal(c.insertLink("", S(0), "javascript:alert(1)"), null);
  assert.equal(c.insertLink("", S(0), "data:text/html,x"), null);
  assert.equal(c.insertLink("", S(0), "  "), null);
  assert.equal(c.insertLink("", S(0), "https://a.com/x y"), null);
  assert.equal(c.insertLink("x", S(0, 1), "mailto:a@b.com").text, "[x](mailto:a@b.com)");
  assert.equal(c.insertLink("x", S(0, 1), "./문서.md").text, "[x](./문서.md)");
  assert.equal(c.insertImage("", S(0), "https://a.com/i.png").text, "![이미지 설명](https://a.com/i.png)");
  assert.equal(c.insertImage("", S(0), "vbscript:x"), null);
});

test("코드 블록: 언어, 선택 감싸기, 백틱 포함 시 4개 펜스", () => {
  assert.equal(c.insertCodeBlock("", S(0), "python").text, "```python\n\n```");
  assert.equal(c.insertCodeBlock("", S(0), "python").sel.from, 10);
  assert.equal(c.insertCodeBlock("a = 1", S(0, 5), "js").text, "```js\na = 1\n```");
  assert.ok(c.insertCodeBlock("```x```", S(0, 7)).text.startsWith("````"));
  assert.equal(c.insertCodeBlock("앞글자 뒤", S(3, 4)).text.includes("\n```\n"), true);
});

test("구분선과 기호 삽입", () => {
  const r = c.insertRule("본문", S(2));
  assert.equal(r.text, "본문\n\n---\n\n");
  assert.equal(r.sel.from, r.text.length);
  assert.equal(c.insertRule("", S(0)).text, "---\n\n");
  assert.equal(c.insertText("ab", S(1), "★").text, "a★b");
});

test("목록 Enter: 증가·알파벳·체크박스 이어쓰기·빈 항목 종료·표식 안쪽은 기본 동작", () => {
  assert.equal(c.listEnter("1. 가", 4).text, "1. 가\n2. ");
  assert.equal(c.listEnter("a. 가", 4).text, "a. 가\nb. ");
  assert.equal(c.listEnter("z. 가", 4).text, "z. 가\na. ");
  assert.equal(c.listEnter("- 가", 3).text, "- 가\n- ");
  assert.equal(c.listEnter("- [x] 가", 7).text, "- [x] 가\n- [ ] ");
  assert.equal(c.listEnter("  - 가", 5).text, "  - 가\n  - ");
  assert.equal(c.listEnter("- ", 2).text, ""); // 빈 항목 → 종료
  assert.equal(c.listEnter("  - ", 4).text, "  ");
  assert.equal(c.listEnter("- 가나", 3).text, "- 가\n- 나"); // 중간 분리
  assert.equal(c.listEnter("일반 문장", 3), null);
  assert.equal(c.listEnter("- 가", 1), null);
});

const TABLE = "| 이름 | 값 |\n| :--- | :--- |\n| a | 1 |";
test("표 삽입: 열·행 수, 앞뒤 빈 줄 보장", () => {
  const r = c.createTable("", S(0), 3, 2);
  assert.equal(r.text, "| 제목 1 | 제목 2 | 제목 3 |\n| :--- | :--- | :--- |\n|  |  |  |\n|  |  |  |\n");
  const mid = c.createTable("앞", S(1), 2, 1);
  assert.ok(mid.text.startsWith("앞\n\n| 제목 1"));
});

test("표 행/열 추가·삭제·정렬 (커서 위치 기준)", () => {
  const afterHeader = c.tableAddRow(TABLE, S(2));
  assert.equal(afterHeader.text.split("\n").length, 4);
  assert.equal(afterHeader.text.split("\n")[2], "|  |  |"); // 머리글에서 누르면 첫 본문 행 위치
  const col = c.tableAddColumn(TABLE, S(4)); // 첫 열 안
  assert.equal(col.text.split("\n")[0], "| 이름 | 제목 3 | 값 |");
  assert.equal(col.text.split("\n")[1], "| :--- | :--- | :--- |");
  const delRow = c.tableDeleteRow(TABLE, S(TABLE.length - 2));
  assert.equal(delRow.text, "| 이름 | 값 |\n| :--- | :--- |");
  assert.equal(c.tableDeleteRow(TABLE, S(2)), null); // 머리글은 삭제 불가
  const delCol = c.tableDeleteColumn(TABLE, S(TABLE.length - 2)); // 둘째 열
  assert.equal(delCol.text, "| 이름 |\n| :--- |\n| a |");
  assert.equal(c.tableDeleteColumn(delCol.text, S(2)), null); // 마지막 열 보존
  const right = c.tableSetAlign(TABLE, S(TABLE.length - 2), "right");
  assert.equal(right.text.split("\n")[1], "| :--- | ---: |");
  const center = c.tableSetAlign(right.text, S(2), "center");
  assert.equal(center.text.split("\n")[1], "| :---: | ---: |");
  assert.equal(c.tableAddRow("표가 아님", S(1)), null);
});

test("표: 이스케이프된 파이프, 코드 안의 파이프, 코드 펜스 안은 표 아님", () => {
  const t = "| a | b |\n| --- | --- |\n| x \\| y | `p|q` |";
  const r = c.tableAddRow(t, S(t.length - 3));
  const lines = r.text.split("\n");
  assert.equal(lines[2], "| x \\| y | `p|q` |");
  assert.equal(lines[3], "|  |  |");
  const fenced = "```\n| a | b |\n| --- | --- |\n```";
  assert.equal(c.tableAddRow(fenced, S(8)), null);
  assert.equal(c.inTable(TABLE, 3), true);
  assert.equal(c.inTable("일반", 1), false);
});

test("한글·이모지·CRLF 입력에서도 오류 없이 동작", () => {
  const t = "😀 안녕\r\n두번째";
  const r = c.setList(t, all(t), "bullet");
  assert.ok(r.text.startsWith("- 😀 안녕"));
  assert.doesNotThrow(() => c.toggleHeading("", S(0), 1));
  assert.doesNotThrow(() => c.toggleWrap("", S(5, 99), "**"));
});
