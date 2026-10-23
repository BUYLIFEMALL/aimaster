"use client";
import { useCallback, useRef, useState } from "react";

interface HistoryState<T> { past: T[]; present: T; future: T[] }
const LIMIT = 100;

/**
 * 실행 취소/다시 실행. set(updater)은 한 단계로 기록되고, set(updater, true)는 기록 없이 현재값만 바꾼다
 * (드래그처럼 연속 변경 중에 쓰고, 시작 시점에 checkpoint()를 한 번 호출한다).
 */
export function useHistory<T>(initial: T) {
  const [state, setState] = useState<HistoryState<T>>({ past: [], present: initial, future: [] });
  const ref = useRef(state);
  ref.current = state;

  const commit = useCallback((next: HistoryState<T>) => {
    ref.current = next;
    setState(next);
  }, []);

  const set = useCallback((updater: T | ((prev: T) => T), replace = false) => {
    const cur = ref.current;
    const next = typeof updater === "function" ? (updater as (p: T) => T)(cur.present) : updater;
    if (next === cur.present) return;
    if (replace) commit({ ...cur, present: next });
    else commit({ past: [...cur.past, cur.present].slice(-LIMIT), present: next, future: [] });
  }, [commit]);

  /** 연속 변경 직전의 상태를 한 단계로 저장한다 */
  const checkpoint = useCallback(() => {
    const cur = ref.current;
    commit({ past: [...cur.past, cur.present].slice(-LIMIT), present: cur.present, future: [] });
  }, [commit]);

  const undo = useCallback(() => {
    const cur = ref.current;
    if (!cur.past.length) return;
    commit({ past: cur.past.slice(0, -1), present: cur.past[cur.past.length - 1], future: [cur.present, ...cur.future] });
  }, [commit]);

  const redo = useCallback(() => {
    const cur = ref.current;
    if (!cur.future.length) return;
    commit({ past: [...cur.past, cur.present], present: cur.future[0], future: cur.future.slice(1) });
  }, [commit]);

  const reset = useCallback((value: T) => commit({ past: [], present: value, future: [] }), [commit]);

  return { value: state.present, set, checkpoint, undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}
