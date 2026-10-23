"use client";
import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import type { AnalysisResult, Real, Suggestion } from "@/lib/kw/types";

export function CopyButton({ text, label = "복사" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement("textarea");
      t.value = text;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  }
  return (
    <button type="button" className="kw-mini" onClick={copy} aria-label={`${label}`}>
      {done ? <Check size={12} /> : <Copy size={12} />}
      {done ? "복사됨" : label}
    </button>
  );
}

function Score({ label, value, hint, invert }: { label: string; value: number; hint?: string; invert?: boolean }) {
  // 경쟁 난이도는 높을수록 나쁘므로 색을 반대로 쓴다
  const good = invert ? 100 - value : value;
  const tone = good >= 70 ? "good" : good >= 40 ? "mid" : "bad";
  return (
    <div className={`kw-score ${tone}`}>
      <div className="kw-score-ring" style={{ ["--p" as string]: `${value}%` }}><strong>{value}</strong></div>
      <span>{label}</span>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Suggestions({ title, items, onPick }: { title: string; items: Suggestion[]; onPick?: (t: string) => void }) {
  if (!items.length) return null;
  return (
    <section className="card kw-sec">
      <h2>{title}</h2>
      <ol className="kw-sug">
        {items.map((s, i) => (
          <li key={i}>
            <div className="kw-sug-head">
              <strong>{s.title}</strong>
              <span className="kw-sug-actions">
                <CopyButton text={s.title} label="제목 복사" />
                {onPick && <button type="button" className="kw-mini" onClick={() => onPick(s.title)}>이 제목으로 분석</button>}
              </span>
            </div>
            {s.thumbnailCopy && <p className="kw-chip-line"><span className="kw-chip">썸네일 문구</span>{s.thumbnailCopy}</p>}
            {s.strategy && <p className="kw-strategy">{s.strategy}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function RealBox({ real }: { real: Real }) {
  const has = real.monthlyTotal != null || real.blogDocTotal != null || (real.trend && real.trend.length) || real.notes?.length;
  if (!has) return null;
  const max = Math.max(1, ...(real.trend ?? []).map((p) => p.ratio));
  return (
    <section className="card kw-sec">
      <h2>실측 지표 <span className="kw-badge real">실측</span></h2>
      <div className="kw-real">
        {real.monthlyTotal != null && (
          <div><small>월간 검색수(네이버 검색광고)</small><strong>{real.monthlyTotal.toLocaleString("ko-KR")}</strong>
            <small>PC {real.monthlyPc?.toLocaleString("ko-KR")} · 모바일 {real.monthlyMobile?.toLocaleString("ko-KR")}</small></div>
        )}
        {real.blogDocTotal != null && (
          <div><small>네이버 블로그 문서 수</small><strong>{real.blogDocTotal.toLocaleString("ko-KR")}</strong>
            {real.monthlyTotal ? <small>검색수 대비 문서 비율 {(real.blogDocTotal / Math.max(1, real.monthlyTotal)).toFixed(1)}배</small> : null}</div>
        )}
        {real.compIdx && <div><small>광고 경쟁도</small><strong>{real.compIdx}</strong></div>}
      </div>
      {real.trend && real.trend.length > 1 && (
        <div className="kw-trend" aria-label="최근 12개월 검색 추이(상대 지수)">
          {real.trend.map((p) => (
            <div key={p.period} title={`${p.period.slice(0, 7)} · ${p.ratio}`}>
              <i style={{ height: `${Math.max(4, (p.ratio / max) * 100)}%` }} />
              <small>{p.period.slice(5, 7)}월</small>
            </div>
          ))}
        </div>
      )}
      {real.notes?.map((n, i) => <p key={i} className="muted" style={{ marginTop: 8 }}>※ {n}</p>)}
    </section>
  );
}

function Sources({ sources }: { sources: { title: string; uri: string }[] }) {
  if (!sources.length) return null;
  return (
    <section className="card kw-sec">
      <h2>참고한 출처</h2>
      <ul className="kw-links">
        {sources.map((s) => (
          <li key={s.uri}><a href={s.uri} target="_blank" rel="noreferrer noopener"><ExternalLink size={12} />{s.title}</a></li>
        ))}
      </ul>
    </section>
  );
}

export function ResultView({ result, onKeyword }: { result: AnalysisResult; onKeyword: (kw: string, feature?: string) => void }) {
  switch (result.kind) {
    case "autocomplete":
      return (
        <>
          <section className="card kw-sec">
            <h2>자동완성 키워드 {result.keywords.length}개 <span className="kw-badge">{result.engine === "naver" ? "네이버" : "구글"}</span></h2>
            <p className="muted">키워드를 누르면 그 키워드로 다시 분석합니다.</p>
            {result.keywords.length === 0 ? (
              <p className="kw-empty">자동완성 결과가 없습니다. 다른 키워드로 시도해 주세요.</p>
            ) : (
              <ul className="kw-kwlist">
                {result.keywords.map((k) => (
                  <li key={k.text}>
                    <button type="button" onClick={() => onKeyword(k.text)}>{k.text}</button>
                    {k.monthlyTotal != null && <small title="네이버 검색광고 기준 월간 검색수">월 {k.monthlyTotal.toLocaleString("ko-KR")}</small>}
                  </li>
                ))}
              </ul>
            )}
          </section>
          {result.topics && <Suggestions title={`만든 글 주제 (${result.topics.mode === "main" ? "메인 키워드 중심" : "전체 키워드 조합"})`} items={result.topics.items} />}
        </>
      );
    case "related":
      return (
        <>
          <section className="card kw-sec">
            <h2>연관 검색어</h2>
            <ul className="kw-kwlist rich">
              {result.relatedSearches.map((r) => (
                <li key={r.keyword}>
                  <button type="button" onClick={() => onKeyword(r.keyword)}>{r.keyword}</button>
                  <small>{r.reason}</small>
                </li>
              ))}
            </ul>
          </section>
          <section className="card kw-sec">
            <h2>사람들이 함께 묻는 질문</h2>
            <div className="kw-paa">
              {result.peopleAlsoAsk.map((p) => (
                <details key={p.question}>
                  <summary>{p.question}</summary>
                  <p>{p.answer}</p>
                  {p.gap && <p className="kw-gap"><b>콘텐츠 갭</b> {p.gap}</p>}
                </details>
              ))}
            </div>
            {result.contentGap && <div className="notice" style={{ marginTop: 14 }}><strong>상위 글이 비워 둔 부분</strong><p>{result.contentGap}</p></div>}
          </section>
          {result.strategy && (
            <>
              <section className="card kw-sec">
                <h2>검색 의도와 기둥 글</h2>
                <p>{result.strategy.userIntent}</p>
                <h3 className="kw-h3">{result.strategy.pillarPost.title}</h3>
                <ul className="gd-list">{result.strategy.pillarPost.outline.map((o, i) => <li key={i}>{o}</li>)}</ul>
              </section>
              <Suggestions title="콘텐츠 갭을 메우는 글 제안" items={result.strategy.suggestions} />
            </>
          )}
          <Sources sources={result.sources} />
        </>
      );
    case "blogs":
      return (
        <>
          <RealBox real={result.real} />
          <section className="card kw-sec">
            <h2>네이버 상위 블로그 {result.posts.length}개</h2>
            <ol className="kw-posts">
              {result.posts.map((p, i) => (
                <li key={p.link + i}>
                  <a href={p.link} target="_blank" rel="noreferrer noopener">{p.title}</a>
                  <small>{p.blogger}{p.postdate ? ` · ${p.postdate.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3")}` : ""}</small>
                </li>
              ))}
            </ol>
          </section>
          <section className="card kw-sec">
            <h2>상위 글 분석</h2>
            <h3 className="kw-h3">구조</h3><p>{result.analysis.structure}</p>
            <h3 className="kw-h3">공통 특징</h3><p>{result.analysis.characteristics}</p>
            {result.analysis.commonKeywords.length > 0 && (
              <div className="kw-tags">{result.analysis.commonKeywords.map((k) => <button type="button" key={k} onClick={() => onKeyword(k)}>{k}</button>)}</div>
            )}
          </section>
          <Suggestions title="1위를 노리는 글 제안" items={result.suggestions} />
        </>
      );
    case "competition": {
      const a = result.analysis;
      return (
        <>
          <section className="card kw-sec">
            <h2>{a.title || "키워드 경쟁력 진단"} <span className="kw-badge">AI 추정</span></h2>
            <div className="kw-scores">
              <Score label="기회 점수" value={result.opportunityScore} hint="높을수록 도전할 가치" />
              <Score label="검색 관심도" value={result.searchInterestIndex} />
              <Score label="경쟁 난이도" value={result.competitionIndex} hint={result.competitionLevel} invert />
            </div>
            <p className="kw-doc">문서 수: <b>{result.documentCount}</b></p>
          </section>
          <RealBox real={result.real} />
          <section className="card kw-sec">
            <h2>분석</h2>
            <h3 className="kw-h3">근거</h3><p>{a.reason}</p>
            <div className="kw-two">
              <div><h3 className="kw-h3 good">기회 요인</h3><p>{a.opportunity}</p></div>
              <div><h3 className="kw-h3 bad">위협 요인</h3><p>{a.threat}</p></div>
            </div>
            <h3 className="kw-h3">소비·이슈 흐름</h3><p>{a.consumption}</p>
            <div className="notice" style={{ marginTop: 14 }}><strong>결론</strong><p>{a.conclusion}</p></div>
          </section>
          {result.strategy && (
            <>
              <section className="card kw-sec">
                <h2>확장 키워드</h2>
                <div className="kw-tags">{result.strategy.expandedKeywords.map((k) => <button type="button" key={k} onClick={() => onKeyword(k)}>{k}</button>)}</div>
              </section>
              <Suggestions title="도전해 볼 글 제안" items={result.strategy.blogTopics} />
            </>
          )}
          <Sources sources={result.sources} />
        </>
      );
    }
    case "recommend":
      return (
        <>
          <section className="card kw-sec">
            <h2>{result.date} 전략 키워드 {result.items.length}개</h2>
            <ol className="kw-sug">
              {result.items.map((i, n) => (
                <li key={n}>
                  <div className="kw-sug-head">
                    <strong><span className={`kw-badge ${i.category.includes("정책") ? "policy" : ""}`}>{i.category}</span> {i.keyword}</strong>
                    <span className="kw-sug-actions">
                      <CopyButton text={i.title} label="제목 복사" />
                      <button type="button" className="kw-mini" onClick={() => onKeyword(i.keyword, "competition")}>경쟁력 분석</button>
                    </span>
                  </div>
                  <p className="kw-strategy">{i.reason}</p>
                  <p className="kw-chip-line"><span className="kw-chip">제목</span>{i.title}</p>
                  {i.thumbnailCopy && <p className="kw-chip-line"><span className="kw-chip">썸네일 문구</span>{i.thumbnailCopy}</p>}
                  <p className="kw-strategy">{i.strategy}</p>
                </li>
              ))}
            </ol>
          </section>
          <Sources sources={result.sources} />
        </>
      );
    case "sustainable":
      return (
        <>
          {result.categories.map((c) => (
            <section className="card kw-sec" key={c.name}>
              <h2>{c.name}</h2>
              <p className="muted">{c.description}</p>
              <ol className="kw-sug">
                {c.topics.map((t, i) => (
                  <li key={i}>
                    <div className="kw-sug-head"><strong>{t.title}</strong><span className="kw-sug-actions"><CopyButton text={t.title} label="제목 복사" /></span></div>
                    <div className="kw-tags">{t.keywords.map((k) => <button type="button" key={k} onClick={() => onKeyword(k)}>{k}</button>)}</div>
                    <p className="kw-strategy">{t.seoStrategy}</p>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </>
      );
    case "news":
      return (
        <>
          <section className="card kw-sec">
            <h2>최신 뉴스 {result.items.length}건</h2>
            <ol className="kw-posts">
              {result.items.map((n, i) => (
                <li key={n.link + i}>
                  <a href={n.link} target="_blank" rel="noreferrer noopener">{n.title}</a>
                  <small>{n.pubDate ? new Date(n.pubDate).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : ""}</small>
                </li>
              ))}
            </ol>
          </section>
          <section className="card kw-sec">
            <h2>뉴스 분석</h2>
            <h3 className="kw-h3">핵심 이슈</h3><p>{result.analysis.coreIssue}</p>
            <h3 className="kw-h3">독자가 궁금해할 지점</h3><p>{result.analysis.userInterestPoint}</p>
            <h3 className="kw-h3">블로그 글의 기회</h3><p>{result.analysis.opportunity}</p>
          </section>
          <Suggestions title="뉴스를 활용한 글 제안" items={result.suggestions} />
        </>
      );
    case "trend":
      return (
        <>
          <section className="card kw-sec">
            <h2>{result.keyword} 분야 흐름</h2>
            <p>{result.summary}</p>
            <h3 className="kw-h3">최신 블로그 제목 빈출어</h3>
            <ul className="kw-freq">
              {result.frequent.map((f) => (
                <li key={f.word}>
                  <button type="button" onClick={() => onKeyword(f.word, "competition")}>{f.word}</button>
                  <small>{f.count}회</small>
                  {f.trendDelta != null && <em className={f.trendDelta >= 0 ? "up" : "down"}>{f.trendDelta >= 0 ? "▲" : "▼"} {Math.abs(f.trendDelta)}%</em>}
                </li>
              ))}
            </ul>
            <p className="muted">▲▼는 데이터랩 검색어 트렌드 기준 최근 4주와 그 직전 4주의 변화입니다(상위 5개 단어만 조회).</p>
            {result.real.notes?.map((n, i) => <p key={i} className="muted">※ {n}</p>)}
          </section>
          <Suggestions title="빈출어를 활용한 글 제안" items={result.keywordBased} />
          <Suggestions title="흐름을 분석해 제안하는 글" items={result.analysisBased} />
        </>
      );
    case "prompt":
      return (
        <>
          <section className="card kw-sec">
            <div className="kw-sug-head"><h2>{result.promptTitle}</h2><CopyButton text={result.markdown} label="전체 복사" /></div>
            <pre className="kw-md">{result.markdown}</pre>
          </section>
          <Sources sources={result.sources} />
        </>
      );
  }
}
