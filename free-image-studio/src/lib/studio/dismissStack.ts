// 열려 있는 「닫을 수 있는 것」(확인 창·접는 메뉴)을 연 순서대로 쌓아 두는 더미(순수 — 브라우저 없이 시험할 수 있다).
// Esc 한 번에는 **가장 나중에 연 것 하나만** 닫는다. 메뉴 위에 확인 창이 떠 있어도 한 번에 둘 다 닫히지 않는다.

export type DismissEntry = { close: () => void };

export function createDismissStack() {
  const open: DismissEntry[] = [];
  return {
    /** 열릴 때 넣는다. 같은 것을 두 번 넣지 않는다 */
    push(entry: DismissEntry) {
      if (!open.includes(entry)) open.push(entry);
    },
    /** 닫힐 때 뺀다(Esc로 닫혔든, 버튼으로 닫혔든, 맨 위가 아니든) */
    remove(entry: DismissEntry) {
      const i = open.indexOf(entry);
      if (i >= 0) open.splice(i, 1);
    },
    /** Esc 한 번: 맨 위 하나의 close만 부른다. 닫을 것이 있었으면 true */
    escape(): boolean {
      const top = open[open.length - 1];
      if (!top) return false;
      top.close();
      return true;
    },
    get size() {
      return open.length;
    },
  };
}

export type DismissStack = ReturnType<typeof createDismissStack>;

/**
 * 키 누름 하나를 어떻게 처리할지 정한다.
 *  - "pass"   우리 일이 아니다(Esc가 아니거나, 열린 것이 없다) — 키의 기본 흐름을 건드리지 않는다
 *  - "held"   Esc를 누른 채 유지해서 생긴 자동 반복 — 아무것도 닫지 않는다(한 번 누름에 하나만 닫는다)
 *  - "closed" 새로 누른 Esc — 맨 위 하나를 닫았다
 */
export function handleEscapeKey(stack: DismissStack, e: { key: string; repeat?: boolean }): "pass" | "held" | "closed" {
  if (e.key !== "Escape" || stack.size === 0) return "pass";
  if (e.repeat === true) return "held";
  stack.escape();
  return "closed";
}

/** 화면 전체가 함께 쓰는 더미 하나 */
export const dismissStack = createDismissStack();
