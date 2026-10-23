import test from "node:test";
import assert from "node:assert/strict";
import {
  makeComponent, deleteComponents, duplicateComponent, moveLayer, groupComponents, ungroupComponents,
  applyPreset, parseImportedJson, clampToCanvas, normalizeAiComponents, marqueeSelect, topLevelId,
  buildDesignSpecJson, isValidComponentsArray,
} from "../src/lib/canvas/model.ts";
import { PRESETS, TOOLBOX } from "../src/lib/canvas/constants.ts";

const mk = (type, x, y, w = 100, h = 40, list = []) => makeComponent(type, { x, y }, { width: w, height: h }, list);

test("컴포넌트 생성: 이름 번호와 차트 데이터", () => {
  const a = mk("Button", 10, 10);
  const b = mk("Button", 20, 20, 100, 40, [a]);
  assert.equal(a.name, "Button1");
  assert.equal(b.name, "Button2");
  const c = mk("BarChart", 0, 0, 400, 250);
  assert.ok(c.props.data.length >= 4 && c.props.data.length <= 7);
  assert.ok(a.id !== b.id);
});

test("툴박스는 24종(그룹 제외)", () => {
  assert.equal(TOOLBOX.length, 24);
});

test("그룹화: 상대좌표·경계 계산, 해제 시 복원", () => {
  const a = mk("Button", 100, 100, 50, 30);
  const b = mk("Text", 200, 150, 80, 20);
  const r = groupComponents([a, b], [a.id, b.id]);
  assert.ok(r.ok);
  const group = r.components.find((c) => c.id === r.groupId);
  assert.deepEqual(group.position, { x: 100, y: 100 });
  assert.deepEqual(group.size, { width: 180, height: 70 });
  const ca = r.components.find((c) => c.id === a.id);
  assert.deepEqual(ca.position, { x: 0, y: 0 });
  assert.equal(topLevelId(a.id, r.components), group.id);
  const u = ungroupComponents(r.components, r.groupId);
  assert.equal(u.components.length, 2);
  assert.deepEqual(u.components.find((c) => c.id === a.id).position, { x: 100, y: 100 });
  assert.equal(u.components.find((c) => c.id === a.id).parentId, undefined);
});

test("그룹화 거부: 1개 선택 / 이미 그룹 소속", () => {
  const a = mk("Button", 0, 0);
  const b = mk("Button", 50, 0);
  assert.equal(groupComponents([a, b], [a.id]).ok, false);
  const g = groupComponents([a, b], [a.id, b.id]);
  const c = mk("Text", 300, 300);
  const again = groupComponents([...g.components, c], [a.id, c.id]);
  assert.equal(again.ok, false);
});

test("삭제: 그룹은 자식까지, 복제: 새 id와 자식 복제", () => {
  const a = mk("Button", 0, 0);
  const b = mk("Button", 50, 0);
  const g = groupComponents([a, b], [a.id, b.id]);
  const dup = duplicateComponent(g.components, g.groupId);
  assert.equal(dup.components.length, g.components.length + 3);
  const newGroup = dup.components.find((c) => c.id === dup.newId);
  assert.deepEqual(newGroup.position, { x: 20, y: 20 });
  const kids = dup.components.filter((c) => c.parentId === dup.newId);
  assert.equal(kids.length, 2);
  assert.equal(deleteComponents(dup.components, [g.groupId]).length, 3);
});

test("레이어 이동 4방향", () => {
  const a = mk("Button", 0, 0), b = mk("Text", 0, 0), c = mk("Input", 0, 0);
  const list = [a, b, c];
  assert.deepEqual(moveLayer(list, a.id, "top").map((x) => x.id), [b.id, c.id, a.id]);
  assert.deepEqual(moveLayer(list, c.id, "bottom").map((x) => x.id), [c.id, a.id, b.id]);
  assert.deepEqual(moveLayer(list, a.id, "up").map((x) => x.id), [b.id, a.id, c.id]);
  assert.deepEqual(moveLayer(list, c.id, "down").map((x) => x.id), [a.id, c.id, b.id]);
  assert.deepEqual(moveLayer(list, c.id, "up").map((x) => x.id), [a.id, b.id, c.id]);
});

test("프리셋: 버튼 용도 프리셋은 기본 props로 초기화", () => {
  let btn = mk("Button", 0, 0);
  btn = { ...btn, props: { ...btn.props, text: "저장", extra: 1 } };
  const play = PRESETS.Button.find((p) => p.name === "Play");
  const out = applyPreset(btn, play);
  assert.equal(out.props.icon, "PlayIcon");
  assert.equal(out.props.kind, "icon");
  assert.equal(out.props.extra, undefined);
  const outline = PRESETS.Button.find((p) => p.name === "Outline");
  const styled = applyPreset(btn, outline);
  assert.equal(styled.props.text, "저장");
  assert.equal(styled.styles.borderWidth, 1);
});

test("불러오기: 배열 / 명세 / 잘못된 형식", () => {
  const a = mk("Button", 0, 0);
  const arr = parseImportedJson([JSON.stringify([a])]);
  assert.equal(arr.components.length, 1);
  assert.equal(arr.spec, null);
  const specJson = buildDesignSpecJson({ appName: "앱", appDescription: "설명", screenDescription: "화면" }, [a]);
  const spec = parseImportedJson([specJson]);
  assert.equal(spec.spec.appName, "앱");
  assert.equal(spec.components.length, 1);
  assert.throws(() => parseImportedJson([JSON.stringify({ foo: 1 })]));
  assert.throws(() => parseImportedJson(["not json"]));
  assert.equal(isValidComponentsArray([{ id: 1 }]), false);
});

test("불러오기: 알 수 없는 type 제거, 없는 부모 참조 해제", () => {
  const a = mk("Button", 0, 0);
  const bad = { ...mk("Text", 0, 0), type: "Nope" };
  const orphan = { ...mk("Text", 5, 5), parentId: "missing" };
  const r = parseImportedJson([JSON.stringify([a, bad, orphan])]);
  assert.equal(r.components.length, 2);
  assert.equal(r.components[1].parentId, undefined);
});

test("캔버스 보정: 화면 밖 요소와 큰 요소", () => {
  const a = { ...mk("Button", 5000, -40, 100, 40) };
  const b = { ...mk("Container", 10, 10, 5000, 5000) };
  const out = clampToCanvas([a, b], { width: 1000, height: 600 });
  assert.deepEqual(out[0].position, { x: 900, y: 0 });
  assert.deepEqual(out[1].size, { width: 1000, height: 600 });
});

test("AI 결과 정규화: 잘못된 type·좌표 처리", () => {
  const out = normalizeAiComponents(
    [
      { name: "A", type: "Button", position: { x: 99999, y: 5 }, size: { width: 80, height: 30 }, props: { text: "확인" }, description: "d" },
      { name: "B", type: "Unknown", position: { x: 0, y: 0 }, size: { width: 1, height: 1 }, props: {}, description: "" },
      { name: "C", type: "Group", position: { x: 0, y: 0 }, size: { width: 1, height: 1 }, props: {}, description: "" },
      { name: "D", type: "Input", position: { x: "x", y: null }, size: {}, props: null, description: null },
    ],
    { width: 1000, height: 600 },
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].props.text, "확인");
  assert.equal(out[0].position.x, 920);
  assert.equal(out[1].type, "Input");
  assert.equal(out[1].size.width, 200);
  assert.equal(normalizeAiComponents("x", { width: 1, height: 1 }).length, 0);
});

test("마퀴 선택: 잠금·자식 제외", () => {
  const a = mk("Button", 10, 10);
  const locked = { ...mk("Container", 20, 20), isLocked: true };
  const far = mk("Text", 800, 800);
  const ids = marqueeSelect([a, locked, far], { x: 0, y: 0, width: 300, height: 300 });
  assert.deepEqual(ids, [a.id]);
});
