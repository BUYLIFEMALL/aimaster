"use client";

// 병합 B-6(콘텐츠 메이커 → SEO 스튜디오): 원고 수정 이력 — 이전 수정본을 골라 지금 글과 바뀐 문단을 비교하고 되돌린다.
import { useMemo, useState } from "react";
import { diffParagraphs, readRevisions, type DraftRevision } from "@/lib/draftRevisions";
import type { DraftRecord } from "./shared";

const COLORS = { add: { background: "#e8f7ee", borderLeft: "3px solid #1f9d55" }, del: { background: "#fdecec", borderLeft: "3px solid #d64545", textDecoration: "line-through" }, same: {} } as const;

export function RevisionsPanel({ draft, busy, onRestore }: { draft: DraftRecord; busy: boolean; onRestore: (revision: DraftRevision) => void }) {
  const revisions = readRevisions((draft.seo_report as Record<string, unknown> | null)?.revisions);
  const [picked, setPicked] = useState(0);
  const [onlyChanges, setOnlyChanges] = useState(true);
  const revision = revisions[picked] ?? revisions[0];
  const diff = useMemo(() => (revision ? diffParagraphs(revision.body, draft.body) : []), [revision, draft.body]);
  if (!revisions.length) return null;
  const shown = onlyChanges ? diff.filter((line) => line.type !== "same") : diff;
  const added = diff.filter((l) => l.type === "add").length, removed = diff.filter((l) => l.type === "del").length;

  return (
    <section className="quality-panel card" aria-labelledby="revisions-title">
      <div className="card-head">
        <div>
          <h2 id="revisions-title" className="card-title">수정 이력 ({revisions.length})</h2>
          <p className="draft-result-subtitle">저장할 때마다 바뀌기 전 글을 최근 {revisions.length >= 10 ? "10" : revisions.length}개까지 남깁니다(원고와 함께 30일 뒤 삭제). 고른 수정본과 지금 글을 문단 단위로 비교합니다.</p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select aria-label="비교할 수정본" value={picked} onChange={(e) => setPicked(Number(e.target.value))}>
          {revisions.map((r, i) => <option key={r.at + i} value={i}>{new Date(r.at).toLocaleString("ko-KR")} · {r.reason} · {r.body.replace(/\s/g, "").length.toLocaleString("ko-KR")}자</option>)}
        </select>
        <label style={{ fontSize: 13 }}><input type="checkbox" checked={onlyChanges} onChange={(e) => setOnlyChanges(e.target.checked)} /> 바뀐 문단만 보기</label>
        <button type="button" className="secondary compact" disabled={busy} onClick={() => revision && onRestore(revision)}>이 수정본으로 되돌리기</button>
      </div>
      {revision && revision.title !== draft.title && <p className="draft-result-subtitle">제목: <s>{revision.title}</s> → {draft.title}</p>}
      <p className="draft-result-subtitle">지금 글 기준 추가 {added}문단 · 삭제 {removed}문단 (초록 = 지금 글에 새로 생김, 빨강 = 수정본에만 있음)</p>
      <div style={{ display: "grid", gap: 6, maxHeight: 420, overflow: "auto" }}>
        {shown.length ? shown.map((line, i) => <p key={i} style={{ margin: 0, padding: "6px 8px", borderRadius: 6, whiteSpace: "pre-wrap", fontSize: 13, ...COLORS[line.type] }}>{line.text}</p>)
          : <p className="quality-empty">본문 문단은 같습니다.</p>}
      </div>
    </section>
  );
}
