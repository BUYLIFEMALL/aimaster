"use client";

import { useEffect, useRef, useState } from "react";
import type { EngineClient } from "@/lib/engine";
import { LEDGER_BROKEN } from "@/lib/studio/notices";
import { useDismiss } from "./useDismiss";

const card = "rounded-2xl border border-amber-500/60 bg-[var(--surface)] p-5";
const button = "rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40";
const ghost = "rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm disabled:opacity-40";

/**
 * 접수 기록이 손상됐거나 읽을 수 없을 때의 안내. 멀쩡하면 아무것도 그리지 않는다.
 * 손상된 동안에는 새로 맡기기·다시 보내기가 연결 계층에서 막힌다 — 이 안내가 그 이유와 나가는 길(다시 읽기 / 새로 시작)을 알려 준다.
 * 새로 시작은 확인 창을 거친 뒤에만 한다. 엔진에는 아무것도 보내지 않는다.
 */
export function LedgerNotice({ engine, onChange }: { engine: EngineClient | null; onChange?: () => void }) {
  const [broken, setBroken] = useState(false);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const check = () => {
    if (!engine) return setBroken(false);
    setBroken(engine.ledgerBroken());
  };
  useEffect(() => {
    setAsking(false);
    setMessage(null);
    check();
  }, [engine]); // eslint-disable-line react-hooks/exhaustive-deps

  // 확인 창: 열리면 「그만두기」에 초점을 둔다(실수로 새로 시작을 누르지 않게). Esc로 닫고, 닫히면 연 버튼으로 초점이 돌아간다.
  const openerRef = useDismiss(asking, () => setAsking(false));
  useEffect(() => {
    if (asking) cancelRef.current?.focus();
  }, [asking]);
  const canReset = !!engine && engine.canResetLedger();

  const reset = async () => {
    if (!engine || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const moved = await engine.setAsideBrokenLedger(true);
      setMessage(moved ? LEDGER_BROKEN.done : null);
      setAsking(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "접수 기록을 새로 시작하지 못했습니다.");
    } finally {
      setBusy(false);
      check();
      onChange?.();
    }
  };

  if (!broken)
    return message ? (
      <p role="status" className="rounded-xl border border-[var(--line)] p-3 text-sm">
        {message}
      </p>
    ) : null;

  return (
    <section className={card} role="alert" aria-labelledby="ledger-title">
      <h2 id="ledger-title" className="text-sm font-bold">
        ⚠️ {LEDGER_BROKEN.title}
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">{LEDGER_BROKEN.body}</p>
      {message && <p className="mt-2 text-sm text-red-200">{message}</p>}
      {!canReset && <p className="mt-2 text-sm text-[var(--muted)]">{LEDGER_BROKEN.noReset}</p>}
      {asking ? (
        <div role="alertdialog" aria-labelledby="ledger-ask-title" aria-describedby="ledger-ask-desc" className="mt-3 rounded-xl border border-amber-500/40 p-3">
          <h3 id="ledger-ask-title" className="text-sm font-bold">
            {LEDGER_BROKEN.confirmTitle}
          </h3>
          <p id="ledger-ask-desc" className="mt-1 text-sm text-[var(--muted)]">
            {LEDGER_BROKEN.confirmBody}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void reset()} disabled={busy} className={button}>
              {LEDGER_BROKEN.confirm}
            </button>
            <button type="button" ref={cancelRef} onClick={() => setAsking(false)} disabled={busy} className={ghost}>
              {LEDGER_BROKEN.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              check();
              onChange?.();
            }}
            className={button}
          >
            {LEDGER_BROKEN.retry}
          </button>
          {canReset && (
            <button type="button" ref={openerRef} onClick={() => setAsking(true)} className={ghost}>
              {LEDGER_BROKEN.reset}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
