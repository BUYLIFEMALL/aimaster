"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

// 브라우저 기본 확인 창(confirm) 대신 쓰는 화면 안 확인 상자. const ok = await ask("…") 형태로 쓴다.
// 상자 안에서 누른 키는 밖(가사 싱크의 스페이스·엔터 단축키 등)으로 전달하지 않는다.
interface Ask { message: string; ok: string; danger: boolean; resolve: (v: boolean) => void }
type AskFn = (message: string, opts?: { ok?: string; danger?: boolean }) => Promise<boolean>;
const Ctx = createContext<AskFn | null>(null);

export function useConfirm(): AskFn {
  const v = useContext(Ctx);
  if (!v) throw new Error("ConfirmProvider 안에서만 쓸 수 있습니다.");
  return v;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [cur, setCur] = useState<Ask | null>(null);
  const okBtn = useRef<HTMLButtonElement>(null), cancelBtn = useRef<HTMLButtonElement>(null);
  const ask = useCallback<AskFn>((message, opts) => new Promise<boolean>((resolve) => setCur({ message, ok: opts?.ok ?? "확인", danger: !!opts?.danger, resolve })), []);
  const close = (v: boolean) => { cur?.resolve(v); setCur(null); };
  // 지우기·처음부터처럼 되돌릴 수 없는 확인은 「취소」에 초점 — 탭 싱크 중 무심코 누른 스페이스·엔터가 실행되지 않게
  useEffect(() => { if (cur) (cur.danger ? cancelBtn : okBtn).current?.focus(); }, [cur]);
  return (
    <Ctx.Provider value={ask}>
      {children}
      {cur && (
        <div className="confirm-backdrop" onClick={() => close(false)}>
          <div className="confirm-box card" role="alertdialog" aria-modal="true" aria-label="확인" onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") close(false); }}>
            <p>{cur.message}</p>
            <div className="actions" style={{ justifyContent: "flex-end" }}>
              <button ref={cancelBtn} type="button" onClick={() => close(false)}>취소</button>
              <button ref={okBtn} type="button" className={cur.danger ? "primary danger-fill" : "primary"} onClick={() => close(true)}>{cur.ok}</button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
