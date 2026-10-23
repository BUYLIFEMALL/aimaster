"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { testTitle } from "@/lib/tests/registry";
import type { ResultSummary } from "@/lib/results";

export function HistoryList({ initial }: { initial: ResultSummary[] }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");

  async function remove(id: string) {
    if (!window.confirm("이 결과를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setError("");
    const res = await fetch(`/api/results/${id}`, { method: "DELETE" });
    if (res.ok) setItems((v) => v.filter((x) => x.id !== id)); else setError("삭제하지 못했습니다.");
  }

  if (items.length === 0) return <p className="empty">아직 검사 결과가 없습니다. <a className="subtle-link" href="/dashboard">첫 검사 시작하기</a></p>;
  return (
    <div className="stack">
      {error && <p role="alert" className="error">{error}</p>}
      <div className="project-grid">
        {items.map((r) => (
          <div key={r.id} className="project-card">
            <small>{new Date(r.created_at).toLocaleString("ko-KR")}</small>
            <h3>{testTitle(r.test_id)}</h3>
            <p><b>{r.headline}</b>{r.hasAnalysis ? " · AI 분석 있음" : ""}</p>
            <div className="actions">
              <a className="button" href={`/result/${r.id}`}>결과 보기</a>
              <button type="button" onClick={() => remove(r.id)} aria-label="결과 삭제"><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
