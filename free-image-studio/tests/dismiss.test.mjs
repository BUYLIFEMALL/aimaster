// 맥미니 bdba7c282 재검수 P3: 메뉴와 확인 창이 겹쳐 열렸을 때 Esc 한 번에는 맨 위 하나만 닫고, 그것을 연 버튼으로만 초점이 돌아간다.
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDismissStack, dismissStack, handleEscapeKey } from "../src/lib/studio/dismissStack.ts";

/**
 * 훅(useDismiss)이 하는 일을 그대로 흉내 낸 대역: 열리면 더미에 넣고, 닫히면 빼면서 연 버튼에 초점을 한 번 준다.
 * focus는 초점을 받은 순서 기록.
 */
function harness() {
  const stack = createDismissStack();
  const focus = [];
  const make = (name) => {
    const item = { name, open: false, entry: null };
    item.entry = { close: () => item.close() };
    item.show = () => {
      if (item.open) return;
      item.open = true;
      stack.push(item.entry);
    };
    item.close = () => {
      if (!item.open) return;
      item.open = false;
      stack.remove(item.entry);
      focus.push(name); // 열렸다 닫힐 때 한 번
    };
    return item;
  };
  return { stack, focus, make };
}

test("반례 P3 — 메뉴 위에 확인 창이 떠 있을 때 Esc 한 번은 확인 창만 닫고, 초점은 확인 창을 연 버튼으로만", () => {
  const { stack, focus, make } = harness();
  const menu = make("메뉴 버튼");
  const dialog = make("새로 시작 버튼");
  menu.show();
  dialog.show();
  assert.equal(stack.size, 2);
  assert.equal(stack.escape(), true);
  assert.deepEqual([menu.open, dialog.open], [true, false], "맨 위(나중에 연 것)만 닫힌다");
  assert.deepEqual(focus, ["새로 시작 버튼"], "초점 요청은 한 번, 닫힌 것의 연 버튼으로");
  // 연속 Esc: 다음 한 번이 메뉴를 닫는다
  assert.equal(stack.escape(), true);
  assert.deepEqual([menu.open, dialog.open], [false, false]);
  assert.deepEqual(focus, ["새로 시작 버튼", "메뉴 버튼"]);
  // 더 닫을 것이 없으면 아무 일도 없다
  assert.equal(stack.escape(), false);
  assert.equal(focus.length, 2);
  assert.equal(stack.size, 0);
});

test("역순으로 열어도 나중에 연 것이 먼저 닫힌다. 단독·버튼 닫기·맨 위가 아닌 것 닫기도 초점은 한 번씩", () => {
  // 역순: 확인 창을 먼저 열고 메뉴를 나중에 열었다
  let h = harness();
  let menu = h.make("메뉴 버튼");
  let dialog = h.make("정리하기 버튼");
  dialog.show();
  menu.show();
  h.stack.escape();
  assert.deepEqual([menu.open, dialog.open], [false, true]);
  assert.deepEqual(h.focus, ["메뉴 버튼"]);
  h.stack.escape();
  assert.deepEqual(h.focus, ["메뉴 버튼", "정리하기 버튼"]);
  // 단독
  h = harness();
  dialog = h.make("켜기 버튼");
  dialog.show();
  assert.equal(h.stack.escape(), true);
  assert.deepEqual(h.focus, ["켜기 버튼"]);
  assert.equal(h.stack.escape(), false);
  // 버튼으로 닫기(Esc 아님): 더미에서 빠지고 초점 한 번. 그 뒤 Esc는 남은 것만 닫는다
  h = harness();
  menu = h.make("메뉴 버튼");
  dialog = h.make("새로 맡기기 버튼");
  menu.show();
  dialog.show();
  dialog.close(); // 「그만두기」를 눌렀다
  assert.deepEqual(h.focus, ["새로 맡기기 버튼"]);
  assert.equal(h.stack.size, 1);
  h.stack.escape();
  assert.deepEqual(h.focus, ["새로 맡기기 버튼", "메뉴 버튼"]);
  // 맨 위가 아닌 것을 버튼으로 닫기(메뉴의 ✕): 위의 확인 창은 그대로, Esc는 확인 창을 닫는다
  h = harness();
  menu = h.make("메뉴 버튼");
  dialog = h.make("새로 시작 버튼");
  menu.show();
  dialog.show();
  menu.close();
  assert.deepEqual([menu.open, dialog.open], [false, true]);
  assert.equal(h.stack.escape(), true);
  assert.deepEqual(h.focus, ["메뉴 버튼", "새로 시작 버튼"]);
  // 같은 것을 두 번 열거나 두 번 닫아도 한 번으로 친다
  h = harness();
  dialog = h.make("켜기 버튼");
  dialog.show();
  dialog.show();
  h.stack.push(dialog.entry);
  assert.equal(h.stack.size, 1);
  dialog.close();
  dialog.close();
  h.stack.remove(dialog.entry);
  assert.deepEqual(h.focus, ["켜기 버튼"]);
  // 세 개가 겹쳐도 한 번에 하나씩, 연 역순으로
  h = harness();
  const [a, b, c] = ["가", "나", "다"].map((n) => h.make(n));
  a.show();
  b.show();
  c.show();
  h.stack.escape();
  h.stack.escape();
  h.stack.escape();
  assert.deepEqual(h.focus, ["다", "나", "가"]);
});

test("훅은 Esc를 한 곳에서만 듣고 맨 위 하나만 닫는다 — 닫힐 때 그 훅의 연 버튼에만 초점", async () => {
  const hook = await readFile(new URL("../src/components/studio/useDismiss.ts", import.meta.url), "utf8");
  assert.equal(hook.split('window.addEventListener("keydown", onKey)').length - 1, 1, "듣는 곳은 하나");
  assert.ok(hook.includes('if (handleEscapeKey(dismissStack, e) !== "pass") e.stopPropagation();'), "Esc 한 번에 더미의 맨 위 하나만, 우리 일이 아니면 손대지 않는다");
  assert.ok(!/close\(\);\s*\}\s*;\s*window\.addEventListener/.test(hook) && !hook.includes('if (e.key === "Escape") close();'), "훅마다 따로 Esc를 듣던 예전 방식이 없다");
  assert.ok(hook.includes("dismissStack.push(entry);") && hook.includes("dismissStack.remove(entry);"));
  assert.ok(/if \(!open\) \{\s*if \(wasOpen\.current\) \{\s*wasOpen\.current = false;\s*opener\.current\?\.focus\(\);/.test(hook), "열렸다가 닫힌 때에만, 자기 연 버튼에 한 번");
  assert.equal(hook.split(".focus()").length - 1, 1, "초점을 옮기는 곳은 한 곳");
  assert.ok(hook.includes("closeRef.current = close;"), "닫는 함수는 늘 최신 것을 부른다");
  assert.equal(dismissStack.size, 0);
  // 화면 파일들은 Esc를 직접 듣지 않는다(모두 이 훅을 거친다)
  for (const rel of ["components/Sidebar.tsx", "components/studio/CreateScreen.tsx", "components/studio/ConvertPanel.tsx", "components/studio/LedgerNotice.tsx", "components/studio/JobsScreen.tsx", "components/studio/StartScreen.tsx", "components/studio/SettingsScreen.tsx"]) {
    const src = await readFile(new URL(`../src/${rel}`, import.meta.url), "utf8");
    assert.ok(!/"Escape"|addEventListener\("keydown"/.test(src), `${rel}: Esc를 따로 듣지 않는다`);
  }
});

test("반례 P3 — Esc를 누른 채 유지한 자동 반복은 아래 것을 더 닫지 않는다. 새로 누른 Esc는 정상으로 닫고, 열린 것이 없으면 키를 건드리지 않는다", () => {
  const { stack, focus, make } = harness();
  const menu = make("메뉴 버튼");
  const dialog = make("새로 시작 버튼");
  menu.show();
  dialog.show();
  // 첫 누름: 확인 창만 닫힌다
  assert.equal(handleEscapeKey(stack, { key: "Escape", repeat: false }), "closed");
  assert.deepEqual([menu.open, dialog.open], [true, false]);
  // 누른 채 유지 — 자동 반복이 몇 번 와도 메뉴는 닫히지 않고 초점 요청도 없다
  for (let i = 0; i < 5; i++) assert.equal(handleEscapeKey(stack, { key: "Escape", repeat: true }), "held");
  assert.deepEqual([menu.open, dialog.open], [true, false]);
  assert.deepEqual(focus, ["새로 시작 버튼"]);
  // 손을 뗐다가 새로 누른 Esc: 메뉴가 닫힌다
  assert.equal(handleEscapeKey(stack, { key: "Escape" }), "closed");
  assert.deepEqual([menu.open, dialog.open], [false, false]);
  assert.deepEqual(focus, ["새로 시작 버튼", "메뉴 버튼"]);
  // 열린 것이 없을 때: Esc든 반복이든 다른 키든 기본 흐름 그대로
  assert.equal(handleEscapeKey(stack, { key: "Escape" }), "pass");
  assert.equal(handleEscapeKey(stack, { key: "Escape", repeat: true }), "pass");
  assert.equal(focus.length, 2);
  // 다른 키는 열린 것이 있어도 건드리지 않는다
  menu.show();
  for (const key of ["Enter", "Tab", " ", "a", "Esc"]) assert.equal(handleEscapeKey(stack, { key }), "pass", key);
  assert.equal(menu.open, true);
  // 처음부터 누른 채로 들어온 반복(첫 이벤트가 repeat)도 닫지 않는다
  assert.equal(handleEscapeKey(stack, { key: "Escape", repeat: true }), "held");
  assert.equal(menu.open, true);
  assert.equal(handleEscapeKey(stack, { key: "Escape", repeat: false }), "closed");
  assert.equal(menu.open, false);
});
