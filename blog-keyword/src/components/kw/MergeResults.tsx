"use client";
// 블로그 병합 묶음 C(2026-10-24): 키워드 등급 탐색·급상승 검증·블로그 벤치마킹 결과 화면(작업실 KeywordsView·TrendsView·BenchmarkView 기능을 이 프로그램 모양으로).
import { ExternalLink, Star } from "lucide-react";
import type { BenchmarkResult, DiscoverResult, SurgeResult } from "@/lib/kw/types";
import type { KeywordMetric } from "@/lib/kw/grade";

const n = (v: number) => v.toLocaleString("ko-KR");
const GRADE_CLASS: Record<string, string> = { 골드: "gold", 실버: "silver", 일반: "normal", 경쟁: "hard", "검색 적음": "low" };

export function GradeBadge({ grade }: { grade: string }) {
  return <span className={`kw-grade ${GRADE_CLASS[grade] ?? "normal"}`}>{grade}</span>;
}

function MetricCells({ m }: { m: KeywordMetric | null }) {
  if (!m) return <><td>-</td><td>-</td><td>-</td></>;
  return (
    <>
      <td title={`PC ${n(m.pc)} · 모바일 ${n(m.mobile)}`}>{n(m.total)}</td>
      <td>{m.docs == null ? <span className="muted">값 없음</span> : n(m.docs)}</td>
      <td><GradeBadge grade={m.grade} /></td>
    </>
  );
}

const GRADE_HELP = "등급 = 블로그 문서 수 ÷ 월 검색량(네이버 실측). 골드: 10 미만·검색 1,000회 이상 / 실버: 30 미만 / 일반: 150 미만 / 경쟁: 150 이상 / 검색 적음: 월 100회 미만. 문서 수를 읽지 못하면 「값 없음」(0과 다름).";

export function DiscoverView({ result, onKeyword }: { result: DiscoverResult; onKeyword: (kw: string, feature?: string) => void }) {
  return (
    <section className="card kw-sec">
      <h2>키워드 등급 {result.candidates.length}개 <span className="kw-badge real">네이버 실측</span></h2>
      <p className="muted">{GRADE_HELP} 검색어를 누르면 경쟁력 분석으로 이어집니다.</p>
      {result.judged && (
        <p className="muted">주제 판정: 연관어 {result.judged.fit.length + result.judged.unfit.length}개 중 {result.judged.fit.length}개만 수치를 조회했습니다{result.judged.reused ? " (6시간 안의 판정을 다시 씀)" : ""}.</p>
      )}
      {result.notes.map((x, i) => <p key={i} className="muted">※ {x}</p>)}
      <div className="kw-table-wrap">
        <table className="kw-table">
          <thead><tr><th>검색어</th><th>월 검색량</th><th>문서 수</th><th>등급</th><th>문서÷검색</th><th>출처·이유</th></tr></thead>
          <tbody>
            {result.candidates.map((c) => (
              <tr key={c.keyword}>
                <td><button type="button" className="kw-link" onClick={() => onKeyword(c.keyword, "competition")}>{c.keyword}</button></td>
                <MetricCells m={c} />
                <td>{c.ratio == null ? "-" : c.ratio.toFixed(1)}</td>
                <td><small>{c.source}{c.reason ? ` · ${c.reason}` : ""}</small></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Spark({ series }: { series: number[] }) {
  if (series.length < 2) return <span className="muted">-</span>;
  const max = Math.max(...series, 1);
  const pts = series.map((v, i) => `${(i / (series.length - 1)) * 100},${30 - (v / max) * 28}`).join(" ");
  return <svg className="kw-spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} /></svg>;
}

export function SurgeView({ result, onKeyword }: { result: SurgeResult; onKeyword: (kw: string, feature?: string) => void }) {
  return (
    <>
      <section className="card kw-sec">
        <h2>{result.keyword} 급상승 검증</h2>
        <p>{result.summary}</p>
        <p className="muted">급상승: 데이터랩 최근 3일 평균이 직전 7일보다 50% 이상 높고, 3일 중 2일 이상·마지막 날이 직전 평균보다 높을 때. 최근 1~2일은 집계 지연으로 빠질 수 있습니다.</p>
        {result.notes.map((x, i) => <p key={i} className="muted">※ {x}</p>)}
        <div className="kw-table-wrap">
          <table className="kw-table">
            <thead><tr><th>용어</th><th>14일 추이</th><th>최근 3일 변화</th><th>월 검색량</th><th>문서 수</th><th>등급</th><th>이유</th></tr></thead>
            <tbody>
              {result.terms.map((t) => (
                <tr key={t.term} className={t.surging ? "hot" : undefined}>
                  <td>{t.surging && <span className="kw-badge policy">급상승</span>} <button type="button" className="kw-link" onClick={() => onKeyword(t.term, "competition")}>{t.term}</button></td>
                  <td><Spark series={t.series} /></td>
                  <td>{t.change == null ? <span className="muted">판정 불가</span> : `${t.change >= 0 ? "+" : ""}${Math.round(t.change * 100)}%`}</td>
                  <MetricCells m={t.metric} />
                  <td><small>{t.why}</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card kw-sec">
        <h2>읽은 자료 {result.sources.length}건</h2>
        <ul className="kw-links">
          {result.sources.map((s) => <li key={s.link}><a href={s.link} target="_blank" rel="noreferrer noopener"><ExternalLink size={12} />({s.kind}) {s.title}</a></li>)}
        </ul>
      </section>
    </>
  );
}

export function BenchmarkView({ result, onKeyword, onBenchmark, busy }: {
  result: BenchmarkResult; onKeyword: (kw: string, feature?: string) => void;
  onBenchmark?: (action: "analyze" | "watch", blogId: string, on?: boolean) => void; busy?: boolean;
}) {
  return (
    <>
      <section className="card kw-sec">
        <h2>같은 주제를 쓰는 블로그 {result.blogs.length}곳</h2>
        <p className="muted">최근 7일 안에 관련 글을 쓴 블로그를 앞에 둡니다. ⭐관심 블로그는 다음 벤치마킹 때 맨 앞에 오고, 다시 분석하면 지난번 이후 새 글만 읽습니다(새 글이 없으면 AI를 부르지 않음). 분석은 본인 Gemini 키 1회.</p>
        <ul className="kw-bench">
          {result.blogs.map((b) => {
            const watched = result.watch.includes(b.blogId);
            const done = result.analyses.find((a) => a.blogId === b.blogId);
            return (
              <li key={b.blogId}>
                <span>
                  <strong>{b.name}</strong> <small>{b.blogId} · 검색 {b.hits}건{b.recent ? " · 최근 7일 활동" : ""}</small>
                  <small className="muted">예: {b.sample}</small>
                </span>
                <span className="actions">
                  <a className="kw-mini" href={`https://blog.naver.com/${b.blogId}`} target="_blank" rel="noreferrer noopener"><ExternalLink size={12} />블로그</a>
                  <button type="button" className="kw-mini" aria-pressed={watched} disabled={busy || !onBenchmark} onClick={() => onBenchmark?.("watch", b.blogId, !watched)}><Star size={12} />{watched ? "관심 해제" : "관심"}</button>
                  <button type="button" className="kw-mini" disabled={busy || !onBenchmark} onClick={() => onBenchmark?.("analyze", b.blogId)}>{done ? "새 글 다시 분석" : "최근 글 분석"}</button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
      {result.analyses.map((a) => (
        <section className="card kw-sec" key={a.blogId}>
          <h2>{a.name} 분석 <small className="muted">{new Date(a.at).toLocaleString("ko-KR")}</small></h2>
          <p className="muted">{a.noNew ? "지난번 분석 이후 새 글이 없어 이전 분석을 그대로 보여 줍니다(AI 호출 없음)." : a.newCount ? `지난번 이후 새 글 ${a.newCount}개만 분석했습니다.` : `최근 글 ${a.titles.length}개를 분석했습니다.`}</p>
          <p>{a.pattern}</p>
          {a.strengths.length > 0 && <ul>{a.strengths.map((s) => <li key={s}>{s}</li>)}</ul>}
          <div className="kw-table-wrap">
            <table className="kw-table">
              <thead><tr><th>참고 검색어</th><th>월 검색량</th><th>문서 수</th><th>등급</th><th>이유</th></tr></thead>
              <tbody>
                {a.keywords.map((k) => (
                  <tr key={k.keyword}>
                    <td><button type="button" className="kw-link" onClick={() => onKeyword(k.keyword, "competition")}>{k.keyword}</button></td>
                    <MetricCells m={k.metric} />
                    <td><small>{k.why}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
