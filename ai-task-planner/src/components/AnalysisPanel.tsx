"use client";
import { useEffect, useRef, useState } from "react";
import { analysisSchema, type Analysis } from "@/lib/planner/ai";
export function AnalysisPanel({ date, categoryId, query, revision, completedCount, scope, busy }: { date: string; categoryId: string; query: string; revision: number; completedCount: number; scope: string; busy: boolean }) {
  const [analyzing, setAnalyzing] = useState(false), [error, setError] = useState(""), [needKey, setNeedKey] = useState(false);
  const [result, setResult] = useState<{ result: Analysis; model: string; analyzedAt: string } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => { if (needKey) dialog.current?.showModal(); else dialog.current?.close(); }, [needKey]);
  async function analyze() {
    if (controller.current || busy || !completedCount) return;
    const current = new AbortController(); controller.current = current;
    setAnalyzing(true); setError(""); setNeedKey(false); setResult(null);
    try {
      const response = await fetch("/api/analysis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, categoryId, query, revision }), signal: current.signal });
      const data = await response.json();
      if (!response.ok) { setNeedKey(data.needKey === true); throw new Error(data.error || "분석하지 못했습니다."); }
      if (data.revision !== revision || data.date !== date) throw new Error("분석 범위가 변경됐습니다. 다시 분석해주세요.");
      const parsed = analysisSchema.safeParse(data.result);
      if (!parsed.success || typeof data.model !== "string" || !Number.isFinite(Date.parse(data.analyzedAt))) throw new Error("AI 결과 형식이 올바르지 않습니다. 다시 분석해주세요.");
      setResult({ result: parsed.data, model: data.model, analyzedAt: data.analyzedAt });
    } catch (e) { if (!current.signal.aborted) setError(e instanceof Error ? e.message : "분석 결과를 확인하지 못했습니다."); }
    finally { if (!current.signal.aborted) { controller.current = null; setAnalyzing(false); } }
  }
  return <section className="card analysis-panel">
    <div className="section-header"><h2>AI 성과 분석</h2></div>
    <p className="analysis-desc">완료 기록과 실측 시간을 바탕으로 개선점을 제안합니다. 분석할 때 선택 범위의 작업 제목·분류·수치를 본인 Gemini 계정으로 전달합니다.</p><p className="muted">분석 범위: {scope}</p>
    {!completedCount && <p>선택 범위의 할 일을 완료한 뒤 분석할 수 있습니다.</p>}
    <button className="ai-analyze-btn" onClick={() => void analyze()} disabled={busy || analyzing || !completedCount}>{analyzing ? "분석 중…" : "✨ 달성 결과 분석하기"}</button>
    {error && <p role="alert">{error}</p>}
    <dialog ref={dialog} onCancel={() => setNeedKey(false)} aria-label="본인 Gemini 키 등록 안내" className="analysis-modal"><h3>본인 Gemini 키를 등록해주세요</h3><p>API키등록·플랫폼연동에서 본인 키 등록 방법을 확인해주세요.</p><div className="actions"><a className="button primary" href="/settings">API키등록·플랫폼연동</a><button onClick={() => setNeedKey(false)}>닫기</button></div></dialog>
    {result && <div aria-label="AI 분석 결과" className="analysis-result"><p className="muted">{result.model} · {new Date(result.analyzedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p><p>{result.result.summary}</p><h3>잘한 점</h3><ul>{result.result.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul><h3>다음 실행 제안</h3><ol>{result.result.suggestions.map((s, i) => <li key={i}><strong>{s.action}</strong><p>{s.evidence}</p></li>)}</ol></div>}
  </section>;
}
