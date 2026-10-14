"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Loader2, Printer, Save, Sparkles, Trash2 } from "lucide-react";
import { downloadCanvas, renderShareCard } from "@/lib/shareImage";
import { buildReport, compareResults } from "@/lib/tests/report";
import { getTest } from "@/lib/tests/registry";
import { CRISIS_NOTICE } from "@/lib/tests/content/careTests";
import type { Analysis } from "@/lib/tests/ai";
import type { ScoredResult } from "@/lib/tests/types";

interface Props {
  /** 저장된 결과의 id. 없으면 저장하지 않은 임시 결과(마음 상태 점검) */
  id?: string;
  testId: string;
  result: ScoredResult;
  analysis?: Analysis | null;
  createdAt?: string;
  previous?: { result: ScoredResult; createdAt: string } | null;
  /** 임시 결과에서 [내 기록에 저장]을 눌렀을 때 */
  onSave?: () => Promise<void>;
}

const LEVEL_LABEL = { low: "낮음", mid: "중간", high: "높음" } as const;

export function ResultView({ id, testId, result, analysis: initial = null, createdAt, previous, onSave }: Props) {
  const router = useRouter();
  const test = getTest(testId);
  const [analysis, setAnalysis] = useState<Analysis | null>(initial);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [needKey, setNeedKey] = useState(false);

  if (!test) return <p className="empty">지원하지 않는 검사 결과입니다.</p>;
  const report = buildReport(test, result);
  const sensitive = test.kind === "wellbeing";
  const changes = previous ? compareResults(previous.result, result) : [];

  async function runAnalysis() {
    if (!id) return;
    setBusy(true); setError(""); setNeedKey(false);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setNeedKey(!!data.needKey); throw new Error(data.error || "AI 분석에 실패했습니다."); }
      setAnalysis(data.analysis as Analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI 분석에 실패했습니다.");
    } finally { setBusy(false); }
  }

  async function remove() {
    if (!id || !window.confirm("이 결과를 삭제할까요? 되돌릴 수 없습니다.")) return;
    const res = await fetch(`/api/results/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/history"); else setError("삭제하지 못했습니다.");
  }

  function printPage() { window.print(); }

  function shareImage() {
    if (!test) return;
    downloadCanvas(renderShareCard(test.title, report, result), `성격진단-${test.id}.png`);
  }

  async function save() {
    if (!onSave) return;
    setSaving(true); setError("");
    try { await onSave(); } catch (e) { setError(e instanceof Error ? e.message : "저장하지 못했습니다."); setSaving(false); }
  }

  return (
    <div className="stack">
      <section className="card result-head">
        <p className="eyebrow">{test.title}</p>
        <h1>{report.title}</h1>
        {report.tagline && <p className="result-tag">{report.tagline}</p>}
        {report.summary && <p>{report.summary}</p>}
        <p className="muted">
          {createdAt ? `${new Date(createdAt).toLocaleString("ko-KR")} 검사 · ` : ""}재미와 자기 이해를 위한 참고용이며 진단이 아닙니다.
        </p>
      </section>

      {sensitive && (
        <section className="notice care-notice" role="note">
          <strong>{CRISIS_NOTICE.title}</strong>
          <p>{CRISIS_NOTICE.body}</p>
          <ul className="gd-list">{CRISIS_NOTICE.lines.map((l) => <li key={l}>{l}</li>)}</ul>
        </section>
      )}

      {result.axes && (
        <section className="card">
          <h2>네 가지 기준별 성향</h2>
          <div className="bars">
            {result.axes.map((a) => (
              <div key={a.axis} className="bar-row">
                <span className="bar-l">{a.poles[0]}</span>
                <div className="bar"><i style={{ width: `${a.firstPct}%` }} /><em style={{ left: "50%" }} /></div>
                <span className="bar-r">{a.poles[1]}</span>
                <small>{a.chosen} 우세 · {a.poles[0]} {a.firstPct}%{a.borderline ? " · 경계" : ""}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {result.traits && (
        <section className="card">
          <h2>{sensitive ? "영역별 부담 정도 (0~100, 높을수록 부담)" : "점수 (0~100)"}</h2>
          <div className="bars">
            {result.traits.map((t) => (
              <div key={t.key} className="bar-row single">
                <span className="bar-name">{t.label}</span>
                <div className="bar"><i style={{ width: `${t.score}%` }} /></div>
                <small>{t.score}점{t.level ? ` · ${LEVEL_LABEL[t.level]}` : ""}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      {previous && (
        <section className="card">
          <h2>지난 결과와 비교</h2>
          <p className="muted">{new Date(previous.createdAt).toLocaleDateString("ko-KR")} 결과 대비</p>
          {changes.length > 0
            ? <ul className="gd-list" style={{ marginTop: 8 }}>{changes.map((c, i) => <li key={i}>{c}</li>)}</ul>
            : <p style={{ marginTop: 8 }}>큰 변화 없이 비슷한 결과입니다.</p>}
        </section>
      )}

      {report.notes.length > 0 && <div className="notice">{report.notes.map((n, i) => <p key={i}>{n}</p>)}</div>}

      {(report.strengths.length > 0 || report.cautions.length > 0 || report.tips.length > 0) && (
        <section className="card">
          <div className="cols">
            {report.strengths.length > 0 && <div><h2>강점</h2><ul className="gd-list">{report.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
            {report.cautions.length > 0 && <div><h2>주의할 점</h2><ul className="gd-list">{report.cautions.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
            {report.tips.length > 0 && <div><h2>{sensitive ? "오늘 해 볼 수 있는 작은 실천" : "이렇게 활용해 보세요"}</h2><ul className="gd-list">{report.tips.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
          </div>
        </section>
      )}

      {report.sections.map((s, i) => (
        <section key={i} className="card"><h2>{s.heading}</h2><p>{s.body}</p></section>
      ))}

      {!sensitive && id && (
        <section className="card">
          <div className="head-row">
            <div><h2>AI 심층 분석</h2><p className="muted">내 Gemini 키로 이 결과를 더 구체적으로 풀어 줍니다(1회 호출).</p></div>
            <button type="button" className="primary" onClick={runAnalysis} disabled={busy}>
              {busy ? <><Loader2 size={14} className="ls-spin" />분석 중</> : <><Sparkles size={14} />{analysis ? "다시 분석" : "AI 심층 분석 받기"}</>}
            </button>
          </div>
          {error && (
            <p role="alert" className="error" style={{ marginTop: 10 }}>
              {error} {needKey && <a className="subtle-link" href="/settings">API키등록·플랫폼연동으로 이동</a>}
            </p>
          )}
          {analysis && (
            <div className="analysis">
              <p>{analysis.summary}</p>
              <div className="cols">
                {analysis.strengths.length > 0 && <div><h3>강점</h3><ul className="gd-list">{analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                {analysis.cautions.length > 0 && <div><h3>주의할 점</h3><ul className="gd-list">{analysis.cautions.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
                {analysis.fit.length > 0 && <div><h3>잘 맞는 환경</h3><ul className="gd-list">{analysis.fit.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
              </div>
              <h3>성장 조언</h3>
              <ol className="gd-steps">
                {analysis.advice.map((a, i) => (
                  <li key={i} className="gd-step"><span className="gd-num">{i + 1}</span><div><strong>{a.title}</strong><p>{a.detail}</p></div></li>
                ))}
              </ol>
              {analysis.relationships && <><h3>관계에서의 소통 팁</h3><p>{analysis.relationships}</p></>}
              {analysis.closing && <p className="result-tag">{analysis.closing}</p>}
            </div>
          )}
        </section>
      )}

      {sensitive && !id && (
        <section className="notice">
          <p><b>이 결과는 저장되지 않았습니다.</b> 이 화면을 벗어나면 사라집니다. 나중에 비교해 보고 싶다면 아래에서 내 기록에 저장할 수 있어요(저장해도 AI 분석·종합 프로필에는 쓰이지 않습니다).</p>
          {error && <p role="alert" className="error">{error}</p>}
        </section>
      )}

      <div className="actions no-print">
        <a className="button primary" href="/dashboard">다른 검사 하기</a>
        <a className="button" href={`/test/${test.id}`}>이 검사 다시 하기</a>
        {!sensitive && <a className="button" href="/profile">종합 프로필 보기</a>}
        <button type="button" onClick={printPage}><Printer size={14} />인쇄·PDF 저장</button>
        {!sensitive && <button type="button" onClick={shareImage}><ImageIcon size={14} />결과 이미지 저장</button>}
        {!id && onSave && <button type="button" onClick={save} disabled={saving}>{saving ? <Loader2 size={14} className="ls-spin" /> : <Save size={14} />}내 기록에 저장</button>}
        {id && <button type="button" onClick={remove}><Trash2 size={14} />결과 삭제</button>}
      </div>
    </div>
  );
}
