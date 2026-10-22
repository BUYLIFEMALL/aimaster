"use client";

// BLC-11 (2026-10-22): 「AI 블로그 키워드 자동화」에서 넘어온 자료 카드 — 실측·AI 추정·값 없음을 나눠 보여 준다.
// 값은 넘겨받은 그대로 보여 주고 새 점수를 만들지 않는다. SEO DB에는 저장하지 않는다.
import type { KeywordEvidence } from "@/lib/keywordEvidence";
import type { Studio } from "./useStudio";

const date = (value: string) => new Date(value).toLocaleDateString("ko-KR");
const show = (value: number | string) => (typeof value === "number" ? value.toLocaleString("ko-KR") : value);

export function KeywordHandoffCard({ s, onResearch }: { s: Studio; onResearch?: (evidence: KeywordEvidence) => void }) {
  const { keywordHandoff, setKeywordHandoff, applyHandoffToTitle, applyHandoffToResearch } = s;
  if (!keywordHandoff) return null;
  if (keywordHandoff.status === "loading") return <section className="card keyword-handoff"><p className="section-description">키워드 도구에서 넘어온 자료를 불러오는 중입니다...</p></section>;
  if (keywordHandoff.status === "error") {
    return (
      <section className="card keyword-handoff error" role="alert">
        <div className="keyword-handoff-head"><strong>키워드 도구에서 넘어온 자료를 열지 못했습니다</strong><button type="button" className="text-button" onClick={() => setKeywordHandoff(null)}>닫기</button></div>
        <p className="section-description">{keywordHandoff.error}</p>
      </section>
    );
  }
  const e = keywordHandoff.evidence;
  return (
    <section className="card keyword-handoff" aria-label="키워드 도구에서 넘어온 자료">
      <div className="keyword-handoff-head">
        <div>
          <strong>키워드 도구에서 넘어온 자료 — 「{e.keyword || "키워드 없음"}」</strong>
          <small>{e.featureLabel} · 만든 날 {date(e.createdAt)} · {date(e.expiresAt)}까지 열 수 있음(남은 {e.daysLeft}일)</small>
        </div>
        <button type="button" className="text-button" onClick={() => setKeywordHandoff(null)}>닫기</button>
      </div>

      {(e.measured.length > 0 || e.missing.length > 0) && (
        <div className="keyword-handoff-group">
          <h4>실측 값 <span className="handoff-badge real">실측</span></h4>
          {e.measured.length > 0 && <ul>{e.measured.map((item) => <li key={item.label}><b>{item.label}</b> {show(item.value)}{item.unit && ` ${item.unit}`} <small>출처: {item.source}</small></li>)}</ul>}
          {e.missing.length > 0 && <p className="handoff-missing">값 없음: {e.missing.join(", ")} — 0이 아니라 키워드 도구에서 수집되지 않은 값입니다.</p>}
          {e.notes.map((note) => <p key={note} className="handoff-missing">{note}</p>)}
        </div>
      )}

      {e.estimated.length > 0 && (
        <div className="keyword-handoff-group">
          <h4>AI 추정 값 <span className="handoff-badge">AI 추정</span></h4>
          <ul>{e.estimated.map((item) => <li key={item.label}><b>{item.label}</b> {show(item.value)}</li>)}</ul>
          <p className="handoff-missing">AI가 추정한 값이라 실제 검색수·문서 수가 아닙니다.</p>
        </div>
      )}

      {e.candidates.length > 0 && (
        <div className="keyword-handoff-group">
          <h4>후보 키워드 <small>키워드 도구 결과</small></h4>
          <div className="handoff-chips">{e.candidates.map((item) => <span key={item}>{item}</span>)}</div>
        </div>
      )}

      {e.titles.length > 0 && (
        <div className="keyword-handoff-group">
          <h4>제안 제목 <span className="handoff-badge">AI 제안</span></h4>
          <ul>{e.titles.slice(0, 5).map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      <div className="keyword-handoff-actions">
        <button type="button" className="primary" disabled={!e.keyword} onClick={() => applyHandoffToTitle(e)}>제목 추천에 쓰기</button>
        <button type="button" className="secondary" disabled={!e.keyword} onClick={() => (onResearch ?? applyHandoffToResearch)(e)}>자료 검색어로 쓰기</button>
      </div>
    </section>
  );
}
