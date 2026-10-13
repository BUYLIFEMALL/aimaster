// 결과 이미지의 되돌리기/다시 실행 이력(순수 함수 — 테스트 대상)
export interface History<T> { past: T[]; present: T | null; future: T[] }

export const MAX_HISTORY = 12;

export function emptyHistory<T>(): History<T> {
  return { past: [], present: null, future: [] };
}

/** 새 결과를 현재로 만들고 이전 값은 되돌리기 목록에 쌓는다. 다시 실행 목록은 비운다 */
export function pushResult<T>(h: History<T>, next: T): History<T> {
  const past = h.present !== null ? [...h.past, h.present] : h.past;
  return { past: past.slice(-MAX_HISTORY), present: next, future: [] };
}

export function undo<T>(h: History<T>): History<T> {
  // 이력이 비었어도 결과가 있으면 원본(null)으로 돌아간다
  if (h.past.length === 0) return h.present !== null ? { past: [], present: null, future: [h.present, ...h.future] } : h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: h.present !== null ? [h.present, ...h.future] : h.future };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  return { past: h.present !== null ? [...h.past, h.present] : h.past, present: h.future[0], future: h.future.slice(1) };
}

export const canUndo = <T,>(h: History<T>) => h.past.length > 0 || h.present !== null;
