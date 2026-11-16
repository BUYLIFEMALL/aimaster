import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSection, prepareInsert, MAX_SECTION_BLOCKS } from "../src/lib/builder/sections.ts";

// E3 — 내 섹션(블록 묶음 저장·다시 쓰기)
const P1 = "11111111-2222-4333-8444-555555555555";
const P2 = "11111111-2222-4333-8444-666666666666";
const showcaseManual = { id: "showcase-a", type: "showcase", visible: true, settings: { title: "고른 상품", source: "manual", category_id: "", product_ids: [P1], columns: 4, limit: 8 } };
const notice = { id: "notice-a", type: "notice", visible: true, settings: { title: "공지", count: 5 }, style: { title_font: "serif" } };
const cats = { id: "cat-a", type: "category_icons", visible: true, settings: { title: "", items: [{ category_id: P1, image: "", emoji: "🍎" }, { category_id: P2, image: "", emoji: "🍐" }] } };
const tabs = { id: "tabs-a", type: "tabs", visible: true, settings: { title: "", tabs: [{ label: "가", source: "category", category_id: P1, product_ids: [] }, { label: "나", source: "new", category_id: "", product_ids: [] }], columns: 4, limit: 8 } };

test("이름은 1~40자, 블록은 1~10개, 블록 검사를 통과해야 저장", () => {
  assert.equal(validateSection("", [notice]).ok, false);
  assert.equal(validateSection("가".repeat(41), [notice]).value.name.length, 40);
  assert.equal(validateSection("빈 묶음", []).ok, false);
  assert.equal(validateSection("많음", Array.from({ length: MAX_SECTION_BLOCKS + 1 }, (_, i) => ({ ...notice, id: `n${i}` }))).ok, false);
  assert.equal(validateSection("잘못", [{ ...showcaseManual, settings: { ...showcaseManual.settings, product_ids: [] } }]).ok, false);
  const v = validateSection("  명절 묶음 ", [notice, showcaseManual]);
  assert.equal(v.ok, true);
  assert.equal(v.value.name, "명절 묶음");
  assert.equal(v.value.blocks[0].style.title_font, "serif", "겉모양도 함께 저장");
});

test("같은 몰에 넣으면 그대로, 번호만 새로(지금 쓰는 번호와 안 겹침)", () => {
  const r = prepareInsert([showcaseManual, notice], { sameStore: true, existingIds: ["showcase-a"] });
  assert.equal(r.blocks.length, 2);
  assert.notEqual(r.blocks[0].id, "showcase-a");
  assert.match(r.blocks[0].id, /^showcase-[0-9a-f]{12}$/);
  assert.equal(r.blocks[0].settings.source, "manual");
  assert.deepEqual(r.notes, []);
});

test("다른 몰에 넣으면 상품·카테고리 출처는 신상품으로, 카테고리 바로가기는 빼고 알림", () => {
  const r = prepareInsert([showcaseManual, cats, tabs, notice], { sameStore: false, existingIds: [] });
  assert.deepEqual(r.blocks.map((b) => b.type), ["showcase", "tabs", "notice"]);
  assert.equal(r.blocks[0].settings.source, "new");
  assert.deepEqual(r.blocks[0].settings.product_ids, []);
  assert.equal(r.blocks[1].settings.tabs[0].source, "new");
  assert.equal(r.blocks[1].settings.tabs[0].category_id, "");
  assert.equal(r.notes.length, 2, "출처 바꿈 1줄 + 카테고리 바로가기 뺌 1줄");
  assert.equal(new Set(r.blocks.map((b) => b.id)).size, 3);
});

// FRONT-20261116-04 — 넣기 안내가 사라지던 원인(머리 단추 영역이 렌더마다 새로 만들어짐)과 전역 상태 공유가 다시 생기지 않게 소스 구조를 지킨다
// (화면 컴포넌트는 node 시험에서 그릴 수 없어 구조로 검사, 실제 동작은 Lab ego로 확인 — 결과 문서)
import { readFileSync } from "node:fs";
const src = (p) => readFileSync(new URL(`../src/app/s/[store]/admin/design/${p}`, import.meta.url), "utf8");

test("편집기 머리 단추는 파일 수준 고정 컴포넌트·고정 overrides — 렌더마다 새 함수를 넘기지 않는다", () => {
  const ed = src("design-editor.tsx");
  assert.match(ed, /^const PUCK_OVERRIDES = \{ headerActions: HeaderActionsSlot \};$/m);
  assert.match(ed, /overrides=\{PUCK_OVERRIDES\}/);
  assert.doesNotMatch(ed, /headerActions:\s*\(/, "headerActions에 화살표 함수를 직접 넘기면 안 됨");
  assert.match(ed, /<HeaderActionsCtx\.Provider value=\{\{ storeId, pending, run \}\}>/, "최신 storeId·pending·run은 컨텍스트로");
  assert.match(ed, /<MySectionsButtons key=\{c\.storeId\} storeId=\{c\.storeId\} \/>/, "몰이 바뀌면 새로 만든다");
});

test("내 섹션 상태는 컴포넌트 안(편집기별), 늦은 응답·예외·오류 보호와 다른 몰 출처 바꾸기는 그대로", () => {
  const ms = src("my-sections.tsx");
  assert.doesNotMatch(ms, /^let |useSyncExternalStore/m, "모듈 전역 상태 금지(편집기·몰끼리 상태가 섞임)");
  assert.match(ms, /useState<Mode>\(null\)/);
  assert.match(ms, /const latest = \(id: number\) => alive\.current && id === req\.current;/);
  for (const fn of ["openInsert", "save", "remove"]) {
    const body = ms.slice(ms.indexOf(`const ${fn} = async`), ms.indexOf("};", ms.indexOf(`const ${fn} = async`)));
    assert.match(body, /if \(!latest\(id\)\) return;/, `${fn}: 늦은 응답 버림`);
  }
  assert.equal((ms.match(/finally \{\s*if \(alive\.current\) setBusy\(false\);/g) ?? []).length, 2, "저장·지우기 모두 예외여도 처리 중 해제");
  assert.match(ms, /onClick=\{close\}/);
  assert.match(ms, /catch \{\s*return \{ ok: false, error: NET_FAIL \};/, "5bfed663d 서버 오류 보호 유지");
  assert.match(ms, /prepareInsert\(s\.blocks, \{ sameStore: s\.source_store_id === storeId, existingIds \}\)/, "다른 몰 출처 신상품화 유지");
});
