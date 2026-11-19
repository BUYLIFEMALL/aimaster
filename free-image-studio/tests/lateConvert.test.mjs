// 맥미니 18d595a68 검수 P2: 변환 응답을 기다리는 동안 사용자가 고친 글을, 늦게 온 응답이 옛 글로 덮지 않는다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyConverted, createTextCell, linesToConvert } from "../src/lib/convert/client.ts";
import { parseEntries, setLineCopies } from "../src/lib/studio/batch.ts";

const TEXT = "a red apple on a table\n식탁 위의 빨간 사과\n나뭇가지에 앉은 파란 새 x2";
const RESULTS = [
  { id: "cccccc01", en: "a red apple on a dining table" },
  { id: "cccccc02", en: "a blue bird sitting on a branch" },
];
/** 요청을 보낼 때의 모습: 그 순간의 글에서 바꿀 줄을 고른다 */
function request(cell) {
  let n = 0;
  return linesToConvert(cell.get(), () => `cccccc${String(++n).padStart(2, "0")}`).items;
}
/** 화면이 하는 그대로: 응답이 도착한 순간의 글을 읽어 반영하고 바로 넣는다 */
function arrive(cell, sent, results = RESULTS) {
  const applied = applyConverted(cell.get(), sent, results);
  cell.set(applied.text);
  return applied;
}

test("반례 P2 — 응답 직전에 고친 줄은 고친 그대로 남는다(옛 글의 번역으로 덮지 않는다). 고치지 않은 줄은 정상으로 바뀐다", () => {
  const cell = createTextCell(TEXT);
  const sent = request(cell);
  assert.equal(sent.length, 2);
  // 기다리는 동안 둘째 줄을 고쳤다. 화면이 다시 그려지기 전(효과가 돌기 전)에 응답이 도착한다 — 칸은 고친 즉시 바뀌어 있다
  cell.set("a red apple on a table\n식탁 위의 초록 배\n나뭇가지에 앉은 파란 새 x2");
  const applied = arrive(cell, sent);
  assert.equal(cell.get(), "a red apple on a table\n식탁 위의 초록 배\na blue bird sitting on a branch x2");
  assert.deepEqual(applied.applied.map((a) => a.lineIndex), [2]);
  assert.equal(applied.skipped, 1);
  // 대조: 요청할 때의 옛 글에 반영했다면(예전 동작) 편집이 사라진다
  const stale = applyConverted(TEXT, sent, RESULTS).text;
  assert.ok(stale.includes("a red apple on a dining table") && !stale.includes("초록 배"), "옛 글 기준이면 편집이 덮인다 — 이 순서를 막는 것이 이 시험");
  assert.notEqual(stale, cell.get());
});

test("기다리는 동안의 여러 편집 — 다른 줄 고침·줄 삭제·줄 추가·장수 변경·전부 비움, 어느 것도 옛 글로 되돌아가지 않는다", () => {
  // 다른 줄(영문 줄)을 고침: 그 편집은 남고, 한글 두 줄은 정상으로 바뀐다
  let cell = createTextCell(TEXT);
  let sent = request(cell);
  cell.set((t) => t.replace("a red apple on a table", "a green pear on a desk"));
  arrive(cell, sent);
  assert.equal(cell.get(), "a green pear on a desk\na red apple on a dining table\na blue bird sitting on a branch x2");
  // 줄 삭제: 지운 줄이 되살아나지 않고, 줄 번호가 밀린 줄에 엉뚱한 번역이 들어가지 않는다
  cell = createTextCell(TEXT);
  sent = request(cell);
  cell.set("a red apple on a table\n나뭇가지에 앉은 파란 새 x2");
  let applied = arrive(cell, sent);
  assert.equal(cell.get(), "a red apple on a table\n나뭇가지에 앉은 파란 새 x2", "밀린 줄은 원문이 그 자리의 것과 달라 건드리지 않는다");
  assert.equal(applied.applied.length, 0);
  assert.ok(!cell.get().includes("dining table"));
  // 맨 위에 줄 추가: 번호가 밀려 아무 줄도 바꾸지 않는다(엉뚱한 줄에 넣느니 그대로 둔다)
  cell = createTextCell(TEXT);
  sent = request(cell);
  cell.set((t) => "새로 적은 줄\n" + t);
  applied = arrive(cell, sent);
  assert.equal(cell.get(), "새로 적은 줄\n" + TEXT);
  assert.equal(applied.skipped, 2);
  // 장수 변경(버튼과 같은 길): 사용자가 새로 정한 장수를 따른다
  cell = createTextCell(TEXT);
  sent = request(cell);
  cell.set((t) => setLineCopies(t, 1, 2)); // 둘째 줄을 2장으로
  cell.set((t) => setLineCopies(t, 2, 1)); // 셋째 줄을 1장으로
  arrive(cell, sent);
  const after = parseEntries(cell.get());
  assert.deepEqual(after.map((e) => [e.source, e.copies]), [["a red apple on a table", 1], ["a red apple on a dining table", 2], ["a blue bird sitting on a branch", 1]]);
  // 전부 비움(일괄 시작 뒤 비우기와 같은 길): 비운 그대로
  cell = createTextCell(TEXT);
  sent = request(cell);
  cell.set("");
  applied = arrive(cell, sent);
  assert.equal(cell.get(), "");
  assert.equal(applied.applied.length, 0);
  // 편집이 없으면 정상으로 모두 바뀐다(교차 확인)
  cell = createTextCell(TEXT);
  sent = request(cell);
  applied = arrive(cell, sent);
  assert.equal(cell.get(), "a red apple on a table\na red apple on a dining table\na blue bird sitting on a branch x2");
  assert.deepEqual([applied.applied.length, applied.skipped], [2, 0]);
  // 결과가 어긋나면 고친 글도, 원래 글도 건드리지 않는다
  cell = createTextCell(TEXT);
  sent = request(cell);
  cell.set((t) => t + "\n한 줄 더");
  const before = cell.get();
  assert.throws(() => arrive(cell, sent, [RESULTS[0]]));
  assert.equal(cell.get(), before);
});

test("회원 변경 — 다른 회원의 글 칸에는 앞 회원의 변환 결과가 들어가지 않는다. 떠난 화면의 응답은 쓰지 않는다", async () => {
  // 회원마다 글 칸이 따로다(화면을 회원별로 새로 만든다). 앞 회원의 응답은 앞 회원 칸만 본다.
  const cellA = createTextCell(TEXT);
  const cellB = createTextCell("다른 회원이 적은 줄\n식탁 위의 빨간 사과");
  const sent = request(cellA);
  const beforeB = cellB.get();
  arrive(cellA, sent);
  assert.equal(cellB.get(), beforeB, "다른 회원의 칸은 그대로");
  // 칸은 넣는 즉시 바뀐다(그리기를 기다리지 않는다) — 함수로 넣으면 지금 값에서 만든다
  const c = createTextCell("가");
  assert.equal(c.set((t) => t + "나"), "가나");
  assert.equal(c.set((t) => t + "다"), "가나다", "연달아 넣어도 앞의 값이 반영돼 있다");
  assert.equal(c.set("라"), "라");
  assert.equal(createTextCell(undefined).get(), "");
  // 소스: 화면이 그 길로만 글을 고치고, 응답 때 지금 글을 읽어 바로 넣는다
  const read = (rel) => readFile(new URL(`../src/${rel}`, import.meta.url), "utf8");
  const create = await read("components/studio/CreateScreen.tsx");
  assert.match(create, /const \[textCell\] = useState\(\(\) => createTextCell\(initial\?\.text \?\? ""\)\);/);
  assert.match(create, /const setText = useCallback\(\(next: string \| \(\(current: string\) => string\)\) => setTextState\(textCell\.set\(next\)\), \[textCell\]\);/);
  assert.equal(create.split("setTextState(").length - 1, 1, "화면의 글을 바꾸는 곳은 setText 한 곳뿐(칸을 거치지 않는 길이 없다)");
  assert.ok(create.includes("getText={textCell.get} onText={setText}"));
  for (const use of ["onChange={(e) => setText(e.target.value)}", "onClick={() => setText((t) => setLineCopies(t, i, n))}", 'setText("")']) assert.ok(create.includes(use), use);
  const panel = await read("components/studio/ConvertPanel.tsx");
  assert.match(panel, /if \(!alive\.current\) return;[^\n]*\n(\s*\/\/[^\n]*\n)*\s*const applied = applyConverted\(getText\(\), items, results\);\s*onText\(applied\.text\);/, "떠난 화면이면 쓰지 않고, 지금 글을 읽어 바로 넣는다(사이에 기다림이 없다)");
  assert.ok(!/applyConverted\(text,|applyConverted\(latest/.test(panel), "그릴 때의 글·따로 기억해 둔 글에 반영하지 않는다");
  assert.match(panel, /useEffect\(\(\) => \{\s*alive\.current = true;\s*return \(\) => \{\s*alive\.current = false;\s*\};\s*\}, \[\]\);/);
});
