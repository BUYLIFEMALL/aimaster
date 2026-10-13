"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookMarked, Download, ExternalLink, FileText, Loader2, Play, Sparkles } from "lucide-react";
import { FEATURE_INFO, type AnalysisResult, type Feature } from "@/lib/kw/types";
import { TREND_CATEGORIES, TREND_LINKS } from "@/lib/kw/links";
import { toCsv, toMarkdown } from "@/lib/kw/export";
import { cleanKeyword } from "@/lib/kw/util";
import { CopyButton, ResultView } from "./ResultView";
import { PromptLibrary } from "./PromptLibrary";

interface KeyState { gemini: boolean; naver: boolean; ads: boolean }
interface Problem { message: string; needKey?: boolean; needNaver?: boolean }

function download(name: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Workbench({ initialReportId }: { initialReportId?: string }) {
  const [feature, setFeature] = useState<Feature>("autocomplete");
  const [keyword, setKeyword] = useState("");
  const [engine, setEngine] = useState<"naver" | "google">("naver");
  const [keys, setKeys] = useState<KeyState | null>(null);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [libOpen, setLibOpen] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const info = FEATURE_INFO.find((f) => f.id === feature)!;

  // 키 등록 상태(값은 받지 않고 등록 여부만 본다)
  useEffect(() => {
    let alive = true;
    fetch("/api/keys", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.keys) return;
        const k = d.keys as Record<string, { hasKey: boolean }>;
        setKeys({
          gemini: !!k.gemini?.hasKey,
          naver: !!k.naver_client_id?.hasKey && !!k.naver_client_secret?.hasKey,
          ads: !!k.naver_ads_api_key?.hasKey && !!k.naver_ads_secret_key?.hasKey && !!k.naver_ads_customer_id?.hasKey,
        });
      })
      .catch(() => { /* 상태 표시만 못 할 뿐 분석에는 영향이 없다 */ });
    return () => { alive = false; };
  }, []);

  // 기록에서 열기
  useEffect(() => {
    if (!initialReportId) return;
    let alive = true;
    fetch(`/api/history?id=${initialReportId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!alive || !d.report) return;
        setFeature(d.report.feature);
        setKeyword(d.report.keyword);
        setResult(d.report.result);
        setReportId(d.report.id);
      })
      .catch(() => setProblem({ message: "기록을 불러오지 못했습니다." }));
    return () => { alive = false; };
  }, [initialReportId]);

  // 분석 경과 시간 표시
  useEffect(() => {
    if (!busy) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const call = useCallback(async (payload: Record<string, unknown>): Promise<{ id: string | null; result: AnalysisResult } | null> => {
    setBusy(true);
    setProblem(null);
    try {
      const res = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProblem({ message: data.error ?? "분석하지 못했습니다.", needKey: !!data.needKey, needNaver: !!data.needNaver });
        return null;
      }
      return data as { id: string | null; result: AnalysisResult };
    } catch {
      setProblem({ message: "서버에 연결하지 못했습니다. 네트워크를 확인하고 다시 시도해 주세요." });
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  async function run(opts: { feature?: Feature; keyword?: string; params?: Record<string, unknown> } = {}) {
    const f = opts.feature ?? feature;
    const fi = FEATURE_INFO.find((x) => x.id === f)!;
    const kw = cleanKeyword(opts.keyword ?? keyword);
    if (fi.needsKeyword && !kw) { setProblem({ message: "키워드를 입력해 주세요." }); return; }
    if (opts.feature) setFeature(f);
    if (opts.keyword != null) setKeyword(kw);
    setLibOpen(false);
    setResult(null);
    setReportId(null);
    const out = await call({ feature: f, keyword: kw, params: { engine, ...(opts.params ?? {}) } });
    if (out) {
      setResult(out.result);
      setReportId(out.id);
      if (out.id) window.history.replaceState(null, "", `/dashboard?report=${out.id}`);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  async function makeTopics(mode: "main" | "all") {
    if (!reportId) return;
    const out = await call({ feature: "autocomplete", keyword, params: { action: "topics", mode, reportId } });
    if (out) setResult(out.result);
  }

  const fileBase = `${info.id}-${(result && "keyword" in result ? result.keyword : keyword) || "result"}`.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 60);
  const naverMissing = info.needsNaver && keys && !keys.naver;
  const geminiMissing = keys && !keys.gemini && feature !== "autocomplete";

  return (
    <div className="kw-layout">
      <div className="kw-main">
        {keys && (
          <div className="kw-keystate" aria-label="키 등록 상태">
            <span className={keys.gemini ? "ok" : "off"}>Gemini {keys.gemini ? "등록됨" : "미등록"}</span>
            <span className={keys.naver ? "ok" : "off"}>네이버 검색 API {keys.naver ? "등록됨" : "미등록"}</span>
            <span className={keys.ads ? "ok" : "opt"}>검색광고 {keys.ads ? "등록됨" : "선택"}</span>
            {(!keys.gemini || !keys.naver) && <a href="/settings">키 등록하기 →</a>}
          </div>
        )}

        <section className="card kw-step" id="feature">
          <h2><span className="step-number">1</span> 분석 종류 선택</h2>
          <div className="kw-features">
            {FEATURE_INFO.filter((f) => f.id !== "prompt").map((f) => (
              <button key={f.id} type="button" aria-pressed={feature === f.id} onClick={() => { setFeature(f.id); setProblem(null); }}>
                <strong>{f.title}</strong>
                <small>{f.desc}</small>
                {f.needsNaver && <em>네이버 키 필요</em>}
              </button>
            ))}
            <button type="button" className="kw-lib-btn" onClick={() => setLibOpen(true)}>
              <strong><BookMarked size={14} /> 프롬프트 라이브러리</strong>
              <small>{FEATURE_INFO.find((f) => f.id === "prompt")!.desc}</small>
            </button>
          </div>
        </section>

        <section className="card kw-step" id="input">
          <h2><span className="step-number">2</span> {info.title}</h2>
          <p className="muted">{info.desc}</p>
          {info.needsKeyword ? (
            <form
              className="kw-form"
              onSubmit={(e) => { e.preventDefault(); void run(); }}
            >
              {feature === "autocomplete" && (
                <div className="kw-seg" role="group" aria-label="검색엔진">
                  <button type="button" aria-pressed={engine === "naver"} onClick={() => setEngine("naver")}>네이버</button>
                  <button type="button" aria-pressed={engine === "google"} onClick={() => setEngine("google")}>구글</button>
                </div>
              )}
              <input
                aria-label="키워드"
                value={keyword}
                maxLength={60}
                list={feature === "trend" ? "kw-categories" : undefined}
                placeholder={info.placeholder}
                onChange={(e) => setKeyword(e.target.value)}
              />
              {feature === "trend" && (
                <datalist id="kw-categories">{TREND_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
              )}
              <button type="submit" className="primary" disabled={busy || !!naverMissing || !!geminiMissing}>
                {busy ? <Loader2 size={14} className="ls-spin" /> : <Play size={14} />}
                {busy ? "분석 중…" : "분석하기"}
              </button>
            </form>
          ) : (
            <div className="actions" style={{ marginTop: 12 }}>
              <button type="button" className="primary" disabled={busy || !!geminiMissing} onClick={() => void run()}>
                {busy ? <Loader2 size={14} className="ls-spin" /> : <Sparkles size={14} />}
                {busy ? "조사 중…" : "오늘의 전략 키워드 찾기"}
              </button>
            </div>
          )}
          {feature === "trend" && (
            <div className="kw-tags" style={{ marginTop: 10 }}>
              {TREND_CATEGORIES.map((c) => <button type="button" key={c} onClick={() => setKeyword(c)}>{c}</button>)}
            </div>
          )}
          {naverMissing && (
            <p className="notice warning" style={{ marginTop: 12 }}>
              이 기능은 본인의 네이버 Client ID/Secret이 필요합니다. <a href="/settings" style={{ textDecoration: "underline" }}>[API키등록·플랫폼연동]</a>에서 등록해 주세요.
            </p>
          )}
          {geminiMissing && (
            <p className="notice warning" style={{ marginTop: 12 }}>
              이 기능은 본인의 Gemini API 키가 필요합니다. <a href="/settings" style={{ textDecoration: "underline" }}>[API키등록·플랫폼연동]</a>에서 등록해 주세요.
            </p>
          )}
          {busy && (
            <p className="kw-progress" role="status">
              <Loader2 size={14} className="ls-spin" /> {elapsed}초 경과 — 검색 결과를 조사하고 있습니다. 보통 10~60초 걸립니다.
            </p>
          )}
          {problem && (
            <p role="alert" className="lp-alert" style={{ marginTop: 12 }}>
              <span>{problem.message}</span>
              {(problem.needKey || problem.needNaver) && <a className="button" href="/settings">키 등록하러 가기</a>}
            </p>
          )}
        </section>

        <div ref={resultRef} className="kw-results" id="result">
          {result && (
            <>
              <div className="kw-resultbar">
                <h2><span className="step-number">3</span> 분석 결과</h2>
                <div className="actions">
                  <span className="muted">{reportId ? "기록에 저장됨" : "저장되지 않음"}</span>
                  <CopyButton text={toMarkdown(result)} label="결과 복사" />
                  <button type="button" className="kw-mini" onClick={() => download(`${fileBase}.md`, toMarkdown(result), "text/markdown;charset=utf-8")}><FileText size={12} />Markdown</button>
                  {toCsv(result) && (
                    <button type="button" className="kw-mini" onClick={() => download(`${fileBase}.csv`, toCsv(result) ?? "", "text/csv;charset=utf-8")}><Download size={12} />CSV</button>
                  )}
                </div>
              </div>
              <ResultView
                result={result}
                onKeyword={(kw, f) => void run({ keyword: kw, feature: (f as Feature | undefined) ?? feature })}
              />
              {result.kind === "autocomplete" && result.keywords.length > 0 && (
                <section className="card kw-sec">
                  <h2>이 키워드로 글 주제 만들기</h2>
                  <p className="muted">Gemini가 제목·썸네일 문구·공략법을 포함한 주제 10개를 제안합니다(본인 Gemini 키 사용).</p>
                  <div className="actions" style={{ marginTop: 10 }}>
                    <button type="button" className="primary" disabled={busy || !reportId || !keys?.gemini} onClick={() => void makeTopics("main")}>메인 키워드로 주제 만들기</button>
                    <button type="button" disabled={busy || !reportId || !keys?.gemini} onClick={() => void makeTopics("all")}>전체 키워드 조합으로 주제 만들기</button>
                  </div>
                  {keys && !keys.gemini && <p className="muted" style={{ marginTop: 8 }}>주제 만들기는 Gemini 키 등록 후 사용할 수 있습니다.</p>}
                </section>
              )}
            </>
          )}
          {!result && !busy && !problem && (
            <p className="kw-empty">분석 종류를 고르고 키워드를 입력하면 결과가 여기에 표시됩니다.</p>
          )}
        </div>
      </div>

      <aside className="kw-side" aria-label="트렌드 도구">
        <section className="card">
          <h2>실시간 트렌드 도구</h2>
          <ul className="kw-links">
            {TREND_LINKS.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noreferrer noopener"><ExternalLink size={12} /><span><b>{l.title}</b><small>{l.desc}</small></span></a>
              </li>
            ))}
          </ul>
        </section>
      </aside>

      {libOpen && <PromptLibrary keyword={keyword} busy={busy || !keys?.gemini} onRun={(id) => void run({ feature: "prompt", params: { promptId: id } })} onClose={() => setLibOpen(false)} />}
    </div>
  );
}
