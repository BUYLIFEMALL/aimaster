"use client";

// v1.74 발행 전 자체 점검표·핵심 단어 빈도·모바일 미리보기 (AI 호출 없음)
import { useMemo, useState } from "react";
import { runQualityChecks, splitParagraphs, summarizeChecks, topWords } from "@/lib/seoQuality";
import type { DraftRecord } from "./shared";

const STATUS_ICON = { pass: "✅", warn: "⚠️", skip: "➖" } as const;

export function QualityPanel({ draft, imageCount }: { draft: DraftRecord; imageCount: number }) {
  const keywords = draft.keywords ?? [];
  const [mobilePreview, setMobilePreview] = useState(false);
  const checks = runQualityChecks({ title: draft.title, body: draft.body, keywords, strategy: draft.strategy, imageCount });
  const summary = summarizeChecks(checks);
  const words = useMemo(() => topWords(draft.body), [draft.body]);
  const keywordSet = new Set(keywords.map((keyword) => keyword.replace(/\s/g, "")));

  return (
    <section className="quality-panel card" aria-labelledby="quality-panel-title">
      <div className="card-head">
        <div><h2 id="quality-panel-title" className="card-title">발행 전 점검</h2><p className="draft-result-subtitle">제목·본문을 고치면 바로 다시 계산합니다. 네이버 공식 점수가 아닌 참고용 자체 점검이며 검색 노출을 보장하지 않습니다.</p></div>
        <span className={`quality-score ${summary.percent >= 80 ? "good" : "low"}`}>{summary.passed} / {summary.total} 통과</span>
      </div>
      <ul className="quality-check-list">
        {checks.map((check) => <li key={check.id} className={`quality-check ${check.status}`}><span aria-hidden="true">{STATUS_ICON[check.status]}</span><strong>{check.label}</strong><small>{check.detail}</small></li>)}
      </ul>
      <div className="quality-words">
        <h3>많이 쓴 단어 상위 {words.length}개</h3>
        <p>조사·자주 쓰는 연결어를 빼고 2번 이상 나온 단어만 셉니다. 초록색은 입력한 핵심 키워드입니다.</p>
        {words.length ? <div className="quality-word-list">{words.map((item) => <span key={item.word} className={keywordSet.has(item.word) ? "quality-word keyword" : "quality-word"}>{item.word} <b>{item.count}</b></span>)}</div> : <p className="quality-empty">아직 2번 이상 나온 단어가 없습니다.</p>}
      </div>
      <div className="quality-mobile">
        <button type="button" className="secondary compact" onClick={() => setMobilePreview((open) => !open)} aria-expanded={mobilePreview}>{mobilePreview ? "모바일 미리보기 닫기" : "📱 모바일 미리보기"}</button>
        {mobilePreview && <div className="mobile-preview-frame" aria-label="휴대폰 폭 미리보기">
          <strong className="mobile-preview-title">{draft.title}</strong>
          {splitParagraphs(draft.body).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>}
      </div>
    </section>
  );
}
