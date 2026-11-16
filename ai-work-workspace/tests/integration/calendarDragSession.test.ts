// 2026-11-17 QA011 — 달력 카드 끌기 리스너 수명(src/litpage/web/features/database/views/calendar/dragSession.ts).
// 취소(pointercancel·Esc·blur·화면 해제) 뒤 나중에 오는 pointerup이 끝 처리(복제·이동)를 부르지 않는지, 정상 놓기는 한 번만인지,
// Alt 누름/뗌이 복사 표시와 맞는지. DOM 없음 — EventTarget 모의.
import { describe, expect, it, vi } from 'vitest';
import { bindDragSession, COPY_CURSOR_CLASS } from '../../src/litpage/web/features/database/views/calendar/dragSession.ts';

function setup() {
  const win = new EventTarget();
  const body = { classList: { remove: vi.fn() } };
  const h = { move: vi.fn(), end: vi.fn(), cancel: vi.fn(), alt: vi.fn() };
  const stop = bindDragSession(win, h, body);
  const ptr = (type: string, altKey = false) => win.dispatchEvent(Object.assign(new Event(type), { altKey, clientX: 0, clientY: 0 }));
  const key = (type: string, k: string) => win.dispatchEvent(Object.assign(new Event(type), { key: k }));
  return { win, body, h, stop, ptr, key };
}

describe('달력 끌기 리스너 수명', () => {
  it('정상 놓기: end 한 번, 그 뒤 pointerup·이동은 무시, 복사 커서 클래스 정리', () => {
    const t = setup();
    t.ptr('pointermove');
    t.ptr('pointerup', true);
    t.ptr('pointerup', true);
    t.ptr('pointermove');
    expect(t.h.end).toHaveBeenCalledTimes(1);
    expect(t.h.move).toHaveBeenCalledTimes(1);
    expect(t.h.cancel).not.toHaveBeenCalled();
    expect(t.body.classList.remove).toHaveBeenCalledWith(COPY_CURSOR_CLASS);
  });

  it.each([
    ['pointercancel', (t: ReturnType<typeof setup>) => t.ptr('pointercancel')],
    ['Esc', (t: ReturnType<typeof setup>) => t.key('keydown', 'Escape')],
    ['창 포커스 잃음', (t: ReturnType<typeof setup>) => t.win.dispatchEvent(new Event('blur'))],
    ['화면 해제(정리 함수)', (t: ReturnType<typeof setup>) => t.stop()],
  ])('%s 뒤 나중 pointerup(Alt 포함)은 복제·이동 0', (_name, cancel) => {
    const t = setup();
    t.ptr('pointermove', true);
    cancel(t);
    t.ptr('pointerup', true);
    t.ptr('pointermove', true);
    expect(t.h.cancel).toHaveBeenCalledTimes(1);
    expect(t.h.end).not.toHaveBeenCalled();
    expect(t.h.move).toHaveBeenCalledTimes(1);
    expect(t.body.classList.remove).toHaveBeenCalledWith(COPY_CURSOR_CLASS);
  });

  it('Alt를 누르고 떼면 그대로 알림(복사 표시를 실제 키와 맞춤), 다른 키는 무시, 끝난 뒤엔 알림 없음', () => {
    const t = setup();
    t.key('keydown', 'Alt');
    t.key('keyup', 'Alt');
    t.key('keydown', 'Shift');
    expect(t.h.alt.mock.calls).toEqual([[true], [false]]);
    t.ptr('pointerup');
    t.key('keydown', 'Alt');
    expect(t.h.alt).toHaveBeenCalledTimes(2);
  });

  it('정리 함수를 두 번 불러도 cancel은 한 번, 놓기 뒤 정리 함수는 아무것도 안 함', () => {
    const a = setup();
    a.stop();
    a.stop();
    expect(a.h.cancel).toHaveBeenCalledTimes(1);
    const b = setup();
    b.ptr('pointerup');
    b.stop();
    expect(b.h.cancel).not.toHaveBeenCalled();
    expect(b.h.end).toHaveBeenCalledTimes(1);
  });
});
