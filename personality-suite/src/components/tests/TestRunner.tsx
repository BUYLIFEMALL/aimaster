"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { SCALE, type Test } from "@/lib/tests/types";

// 한 화면에 한 문항. 답은 브라우저 메모리에만 두고, 마지막 문항에서 서버로 한 번에 보낸다(서버가 점수를 다시 계산).
export function TestRunner({ test }: { test: Test }) {
  const router = useRouter();
  const total = test.questions.length;
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(total).fill(null));
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const done = answers.every((a) => a !== null);
  const current = answers[index];

  const submit = useCallback(async (finalAnswers: (number | null)[]) => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testId: test.id, answers: finalAnswers }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.id) throw new Error(data.error || "결과를 저장하지 못했습니다.");
      router.push(`/result/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "결과를 저장하지 못했습니다.");
      setBusy(false);
    }
  }, [router, test.id]);

  const pick = useCallback((value: number) => {
    if (busy) return;
    const next = answers.slice();
    next[index] = value;
    setAnswers(next);
    if (index < total - 1) setTimeout(() => setIndex((i) => Math.min(i + 1, total - 1)), 160);
  }, [answers, busy, index, total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key >= "1" && e.key <= "5") pick(Number(e.key));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick]);

  const q = test.questions[index];
  const pct = Math.round((answers.filter((a) => a !== null).length / total) * 100);

  return (
    <div className="runner card">
      <div className="runner-top">
        <span>{index + 1} / {total}</span>
        <div className="runner-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>
        <span>{pct}%</span>
      </div>
      <p className="runner-q" aria-live="polite">{q.text}</p>
      <div className="runner-scale" role="radiogroup" aria-label="답변 선택">
        {SCALE.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={current === s.value}
            className={current === s.value ? "scale-btn on" : "scale-btn"}
            onClick={() => pick(s.value)}
            disabled={busy}
          >
            <b>{s.value}</b><span>{s.label}</span>
          </button>
        ))}
      </div>
      <p className="muted runner-hint">키보드 1~5로 답하고 ←로 이전 문항으로 돌아갈 수 있어요.</p>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions runner-nav">
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0 || busy}><ArrowLeft size={14} />이전</button>
        {index < total - 1 ? (
          <button type="button" onClick={() => setIndex((i) => Math.min(total - 1, i + 1))} disabled={current === null || busy}>다음<ArrowRight size={14} /></button>
        ) : (
          <button type="button" className="primary" disabled={!done || busy} onClick={() => submit(answers)}>
            {busy ? <><Loader2 size={14} className="ls-spin" />결과 계산 중</> : "결과 보기"}
          </button>
        )}
      </div>
    </div>
  );
}
