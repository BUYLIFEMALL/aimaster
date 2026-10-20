"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { SCALE, type ScoredResult, type Test } from "@/lib/tests/types";
import { CRISIS_NOTICE } from "@/lib/tests/content/careTests";
import { ResultView } from "./ResultView";

// 한 화면에 한 문항. 답은 브라우저 메모리에만 두고, 마지막 문항에서 서버로 한 번에 보낸다(서버가 점수를 다시 계산).
export function TestRunner({ test }: { test: Test }) {
  const router = useRouter();
  const total = test.questions.length;
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(total).fill(null));
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [temp, setTemp] = useState<ScoredResult | null>(null);
  const sensitive = test.kind === "wellbeing";

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
      if (!res.ok) throw new Error(data.error || "결과를 저장하지 못했습니다.");
      if (data.result && data.saved === false) { setTemp(data.result as ScoredResult); setBusy(false); return; }
      if (!data.id) throw new Error("결과를 저장하지 못했습니다.");
      router.push(`/result/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "결과를 저장하지 못했습니다.");
      setBusy(false);
    }
  }, [router, test.id]);

  // v1.25: 숫자키를 빠르게 연달아 누르면 0.16초 이동 대기 중에 들어온 답이 같은 문항을 덮어써 응답이 빠지던 문제 수정.
  // 지금 문항 번호를 ref로 들고, 이동 대기 중에 새 답이 오면 먼저 다음 문항으로 즉시 옮긴 뒤 그 문항에 기록한다.
  const indexRef = useRef(0);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((i: number) => {
    if (advanceTimer.current) { clearTimeout(advanceTimer.current); advanceTimer.current = null; }
    const next = Math.max(0, Math.min(total - 1, i));
    indexRef.current = next;
    setIndex(next);
  }, [total]);

  useEffect(() => () => { if (advanceTimer.current) clearTimeout(advanceTimer.current); }, []);

  const pick = useCallback((value: number) => {
    if (busy) return;
    if (advanceTimer.current) goTo(indexRef.current + 1);
    const at = indexRef.current;
    setAnswers((prev) => { const next = prev.slice(); next[at] = value; return next; });
    if (at < total - 1) {
      advanceTimer.current = setTimeout(() => { advanceTimer.current = null; indexRef.current = at + 1; setIndex(at + 1); }, 160);
    }
  }, [busy, goTo, total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key >= "1" && e.key <= "5") pick(Number(e.key));
      if (e.key === "ArrowLeft") goTo(indexRef.current - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pick, goTo]);

  async function saveTemp() {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testId: test.id, answers, save: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.id) throw new Error(data.error || "저장하지 못했습니다.");
    router.push(`/result/${data.id}`);
  }

  if (temp) return <ResultView testId={test.id} result={temp} onSave={saveTemp} />;

  const q = test.questions[index];
  const pct = Math.round((answers.filter((a) => a !== null).length / total) * 100);

  return (
    <div className="runner card">
      {sensitive && index === 0 && <p className="notice care-notice" role="note">{CRISIS_NOTICE.body} ({CRISIS_NOTICE.lines.slice(0, 2).join(" · ")})</p>}
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
        <button type="button" onClick={() => goTo(index - 1)} disabled={index === 0 || busy}><ArrowLeft size={14} />이전</button>
        {index < total - 1 ? (
          <button type="button" onClick={() => goTo(index + 1)} disabled={current === null || busy}>다음<ArrowRight size={14} /></button>
        ) : (
          <button type="button" className="primary" disabled={!done || busy} onClick={() => submit(answers)}>
            {busy ? <><Loader2 size={14} className="ls-spin" />결과 계산 중</> : "결과 보기"}
          </button>
        )}
      </div>
    </div>
  );
}
