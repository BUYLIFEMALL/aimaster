"use client";
import { useState } from "react";
import {
  type Analysis as AnalysisType,
  type GlossaryEntry,
} from "@/lib/translation/model";
import { glossaryCsv } from "@/lib/translation/document";
export function Analysis({
  results,
  stale,
  addTerm,
}: {
  results: AnalysisType[];
  stale: boolean;
  addTerm: (entry: GlossaryEntry) => void;
}) {
  const [tab, setTab] = useState("context");
  const distinct = (type: "context" | "terminology") =>
    [
      ...new Map(
        results
          .flatMap((r) => r[type])
          .map((t) => [`${t.sourceTerm}|${t.targetTerm}`, t]),
      ).values(),
    ].slice(0, 200);
  function download() {
    const entries = distinct("terminology").map((t) => ({
      sourceTerm: t.sourceTerm,
      targetTerm: t.targetTerm,
      note: t.explanation.slice(0, 200),
    }));
    const blob = new Blob([glossaryCsv(entries)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = "분석_용어집.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="analysis card">
      <header className="panel-header">
        <h2>AI 검수</h2>
        {stale && results.length > 0 && (
          <span className="status caution">재검수 필요</span>
        )}
      </header>
      <div className="tabs" role="tablist" aria-label="검수 종류">
        {[
          { id: "context", name: "문맥" },
          { id: "terminology", name: "용어" },
          { id: "style", name: "문체" },
        ].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>
      <div className="analysis-content" role="tabpanel">
        {!results.length ? (
          <div className="empty-state">
            <span>✦</span>
            <p>
              번역을 실행하면 문맥·전문 용어·문체 제안을 확인할 수 있습니다.
            </p>
          </div>
        ) : tab === "style" ? (
          <>
            <p className="muted">
              AI 참고 평가입니다. 번역 정확도를 보증하는 점수가 아닙니다.
            </p>
            {results.map((r, i) => (
              <article className="term-card" key={i}>
                <div className="score">
                  <strong>
                    {r.style.score}
                    <small> / 10</small>
                  </strong>
                  <span>
                    {results.length > 1 ? `${i + 1}구간 문체` : "문체 일치도"}
                  </span>
                </div>
                <p>
                  {r.style.formality} · {r.style.tone}
                </p>
                <p>{r.style.feedback}</p>
              </article>
            ))}
          </>
        ) : (
          <>
            {tab === "terminology" && distinct("terminology").length > 0 && (
              <button onClick={download}>분석 용어 CSV 저장</button>
            )}
            {distinct(tab as "context" | "terminology").length ? (
              distinct(tab as "context" | "terminology").map((t, i) => (
                <article className="term-card" key={i}>
                  <strong>
                    {t.sourceTerm} <span>→</span> {t.targetTerm}
                  </strong>
                  <p>{t.explanation}</p>
                  {t.alternatives.length > 0 && (
                    <p className="muted">
                      다른 표현: {t.alternatives.join(", ")}
                    </p>
                  )}
                  <button
                    className="small"
                    disabled={stale}
                    onClick={() =>
                      addTerm({
                        sourceTerm: t.sourceTerm.slice(0, 80),
                        targetTerm: t.targetTerm.slice(0, 160),
                        note: t.explanation.slice(0, 200),
                      })
                    }
                  >
                    내 용어집에 추가
                  </button>
                </article>
              ))
            ) : (
              <p className="muted">이 구간에서 추가 검토할 항목이 없습니다.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
