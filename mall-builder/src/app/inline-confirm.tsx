"use client";

// 화면 안 확인 상자(2026-11-13) — 브라우저 확인 창(window.confirm) 대신 쓴다.
// 이유: 확인 창은 화면 밖에 떠서 휴대폰에서 놓치기 쉽고, 화면 검수 자동 조작이 그 창에서 멈춘다(T1 검수 때 실제로 멈춤).
// 쓰는 법: const c = useInlineConfirm(); <form onSubmit={c.guard(문구)}> … {c.box} </form>
//   처음 누르면 보내지 않고 상자를 띄우고, 상자의 「확인」(같은 폼의 보내기 단추)을 누르면 그대로 보낸다.
import { useState, type FormEvent, type ReactNode } from "react";

export function useInlineConfirm(): {
  guard: (message: string | null | undefined | false) => (e: FormEvent) => void;
  ask: (message: string, onYes: () => void) => void;
  box: ReactNode;
} {
  const [state, setState] = useState<{ message: string; onYes?: () => void } | null>(null);

  const guard = (message: string | null | undefined | false) => (e: FormEvent) => {
    if (!message) return;
    // 상자의 「확인」 단추로 보낸 것만 통과(원래 단추를 빠르게 두 번 눌러도 확인으로 치지 않음)
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    if (state?.message === message && submitter?.hasAttribute("data-confirm-yes")) {
      setState(null);
      return;
    }
    e.preventDefault();
    setState({ message });
  };
  /** 폼 보내기가 아닌 동작(단추 눌러 함수 실행)용 */
  const ask = (message: string, onYes: () => void) => setState({ message, onYes });

  const box = state ? (
    <div role="alertdialog" aria-label="확인" className="mt-2 w-full rounded border border-amber-300 bg-amber-50 p-3 text-sm text-gray-800" data-inline-confirm>
      <p>{state.message}</p>
      <div className="mt-2 flex gap-2">
        {state.onYes ? (
          <button
            type="button"
            onClick={() => {
              const run = state.onYes!;
              setState(null);
              run();
            }}
            className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white"
            data-confirm-yes
          >
            확인
          </button>
        ) : (
          <button type="submit" className="min-h-10 rounded bg-gray-900 px-4 text-sm text-white" data-confirm-yes>
            확인
          </button>
        )}
        <button type="button" onClick={() => setState(null)} className="min-h-10 rounded border bg-white px-4 text-sm" data-confirm-no>
          아니요
        </button>
      </div>
    </div>
  ) : null;

  return { guard, ask, box };
}
