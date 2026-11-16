// 2026-11-17 QA011(Mac msg_b1ebab71c4ab) — 달력 카드 끌기 한 번의 리스너 수명을 한곳에서 관리.
// 정상 놓기(pointerup)는 end 한 번만, 취소(pointercancel·Esc·창 포커스 잃음·화면 해제)는 cancel만 부르고
// 둘 다 리스너·복사 커서 클래스를 모두 정리한다 → 취소 뒤 나중에 오는 pointerup이 복제·이동을 일으키지 않음.
// Alt(Option)를 누르거나 뗄 때마다 alt(누름 여부)로 알려 복사 모드 표시를 실제 키 상태와 맞춘다.

type Target = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;
export interface DragHandlers {
  move: (ev: PointerEvent) => void;
  end: (ev: PointerEvent) => void;
  cancel: () => void;
  alt?: (down: boolean) => void;
}
export const COPY_CURSOR_CLASS = 'nc-cal-copying';

/** 리스너를 붙이고, 정리 함수(취소로 처리)를 돌려준다. 끝·취소는 합쳐서 딱 한 번만. */
export function bindDragSession(win: Target, h: DragHandlers, body?: { classList: Pick<DOMTokenList, 'remove'> } | null): () => void {
  let done = false;
  const cleanup = () => {
    win.removeEventListener('pointermove', onMove as EventListener);
    win.removeEventListener('pointerup', onUp as EventListener);
    win.removeEventListener('pointercancel', onCancel);
    win.removeEventListener('keydown', onKey as EventListener);
    win.removeEventListener('keyup', onKey as EventListener);
    win.removeEventListener('blur', onCancel);
    body?.classList.remove(COPY_CURSOR_CLASS);
  };
  const finish = (fn: () => void) => {
    if (done) return;
    done = true;
    cleanup();
    fn();
  };
  const onMove = (ev: PointerEvent) => {
    if (!done) h.move(ev);
  };
  const onUp = (ev: PointerEvent) => finish(() => h.end(ev));
  const onCancel = () => finish(() => h.cancel());
  const onKey = (ev: KeyboardEvent) => {
    if (done) return;
    if (ev.type === 'keydown' && ev.key === 'Escape') return onCancel();
    if (ev.key === 'Alt') h.alt?.(ev.type === 'keydown');
  };
  win.addEventListener('pointermove', onMove as EventListener);
  win.addEventListener('pointerup', onUp as EventListener);
  win.addEventListener('pointercancel', onCancel);
  win.addEventListener('keydown', onKey as EventListener);
  win.addEventListener('keyup', onKey as EventListener);
  win.addEventListener('blur', onCancel);
  return onCancel;
}
