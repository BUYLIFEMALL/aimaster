"use client";
import { useRef, useState } from "react";
import { FileUp, Globe, Loader2, PenLine, ScanSearch, X } from "lucide-react";
import { FORMATS, LENGTHS, LIMITS, TONES, type FormatId, type LengthId, type ToneId } from "@/lib/we/types";
import { deriveTitle, isTextFileName } from "@/lib/we/util";
import { TemplatePicker } from "./TemplatePicker";

type Mode = "generate" | "analyze";
interface Problem { message: string; needKey?: boolean }

async function readFile(file: File, max: number): Promise<{ text: string; cut: boolean } | { error: string }> {
  if (!isTextFileName(file.name)) return { error: ".txt, .md, .csv 텍스트 파일만 올릴 수 있습니다." };
  if (file.size > 2_000_000) return { error: "파일이 너무 큽니다(2MB 이하)." };
  const raw = (await file.text()).replace(/\r\n?/g, "\n");
  return { text: raw.slice(0, max), cut: raw.length > max };
}

/** 홈: 새 글 생성 또는 기존 글 분석을 시작하면 문서를 만들고 에디터로 이동한다. */
export function StartPanel() {
  const [mode, setMode] = useState<Mode>("generate");
  const [prompt, setPrompt] = useState("");
  const [format, setFormat] = useState<FormatId>("blog");
  const [tone, setTone] = useState<ToneId>("default");
  const [length, setLength] = useState<LengthId>("medium");
  const [useInternet, setUseInternet] = useState(false);
  const [reference, setReference] = useState<{ name: string; text: string; cut: boolean } | null>(null);
  const [existing, setExisting] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [problem, setProblem] = useState<Problem | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function startTimer() {
    setElapsed(0);
    timer.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  }
  function stopTimer() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const r = await readFile(f, mode === "generate" ? LIMITS.reference : LIMITS.document);
    if ("error" in r) { setProblem({ message: r.error }); return; }
    setProblem(null);
    if (mode === "generate") setReference({ name: f.name, text: r.text, cut: r.cut });
    else setExisting(r.text);
  }

  async function createDoc(content: string, fmt: FormatId, sources: unknown[], analyze: boolean) {
    const res = await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: deriveTitle(content), content, content_type: "markdown", format: fmt, sources }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.document?.id) throw new Error(data.error ?? "문서를 저장하지 못했습니다.");
    window.location.assign(`/editor/${data.document.id}${analyze ? "?analyze=1" : ""}`);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setProblem(null);
    setBusy(true);
    startTimer();
    try {
      if (mode === "analyze") {
        if (existing.trim().length < 20) { setProblem({ message: "분석할 글을 20자 이상 입력하거나 파일을 올려 주세요." }); return; }
        await createDoc(existing, "free", [], true);
        return;
      }
      if (!prompt.trim()) { setProblem({ message: "주제나 요청 내용을 입력해 주세요." }); return; }
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, reference: reference?.text ?? null, format, tone, length, useInternet }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setProblem({ message: data.error ?? "초안을 만들지 못했습니다.", needKey: !!data.needKey }); return; }
      await createDoc(String(data.content ?? ""), format, Array.isArray(data.sources) ? data.sources : [], false);
    } catch (err) {
      setProblem({ message: err instanceof Error && err.message ? err.message : "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      stopTimer();
      setBusy(false);
    }
  }

  return (
    <section className="card we-start">
      <div className="we-tabs" role="tablist" aria-label="시작 방식">
        <button type="button" role="tab" aria-selected={mode === "generate"} aria-pressed={mode === "generate"} onClick={() => { setMode("generate"); setProblem(null); }}>
          <PenLine size={14} />새 글 생성
        </button>
        <button type="button" role="tab" aria-selected={mode === "analyze"} aria-pressed={mode === "analyze"} onClick={() => { setMode("analyze"); setProblem(null); }}>
          <ScanSearch size={14} />기존 글 분석
        </button>
      </div>

      <form onSubmit={submit} className="stack" style={{ marginTop: 16 }}>
        {mode === "generate" ? (
          <>
            <TemplatePicker maxLength={LIMITS.prompt} onInsert={(text) => { setPrompt(text); setProblem(null); }} />
            <label>주제 또는 요청
              <textarea
                aria-label="주제 또는 요청"
                value={prompt}
                maxLength={LIMITS.prompt}
                rows={4}
                placeholder="예: 직장인이 생산성을 높이는 5가지 방법에 대한 블로그 글"
                onChange={(e) => setPrompt(e.target.value)}
              />
            </label>
            <div className="we-grid">
              <label>글쓰기 형식
                <select aria-label="글쓰기 형식" value={format} onChange={(e) => setFormat(e.target.value as FormatId)}>
                  {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.label} — {f.hint}</option>)}
                </select>
              </label>
              <label>톤
                <select aria-label="톤" value={tone} onChange={(e) => setTone(e.target.value as ToneId)}>
                  {TONES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
              <label>분량
                <select aria-label="분량" value={length} onChange={(e) => setLength(e.target.value as LengthId)}>
                  {LENGTHS.map((l) => <option key={l.id} value={l.id}>{l.label} ({l.hint})</option>)}
                </select>
              </label>
            </div>
            <div className="we-ref">
              <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.csv,text/plain,text/markdown,text/csv" hidden onChange={onFile} aria-label="참고 파일 선택" />
              <button type="button" onClick={() => fileRef.current?.click()}><FileUp size={14} />참고 파일 첨부 (.txt .md .csv)</button>
              {reference && (
                <span className="we-file">
                  {reference.name}{reference.cut ? ` · 앞 ${LIMITS.reference.toLocaleString("ko-KR")}자만 사용` : ""}
                  <button type="button" aria-label="참고 파일 제거" onClick={() => setReference(null)}><X size={12} /></button>
                </span>
              )}
            </div>
            <label className="we-check">
              <input type="checkbox" checked={useInternet} onChange={(e) => setUseInternet(e.target.checked)} />
              <span><Globe size={13} style={{ verticalAlign: "-2px" }} /> 인터넷 검색 사용 — 최신 정보가 필요할 때 켜세요(출처가 함께 표시됩니다)</span>
            </label>
          </>
        ) : (
          <>
            <label>분석할 글
              <textarea
                aria-label="분석할 글"
                value={existing}
                maxLength={LIMITS.document}
                rows={9}
                placeholder="다듬고 싶은 글을 붙여 넣거나 파일을 올려 주세요. 문법·표현·구조 제안과 문장별 AI 수정을 쓸 수 있습니다."
                onChange={(e) => setExisting(e.target.value)}
              />
            </label>
            <div className="we-ref">
              <input ref={fileRef} type="file" accept=".txt,.md,.markdown,.csv,text/plain,text/markdown,text/csv" hidden onChange={onFile} aria-label="글 파일 선택" />
              <button type="button" onClick={() => fileRef.current?.click()}><FileUp size={14} />파일에서 불러오기</button>
              <span className="muted">{existing.length.toLocaleString("ko-KR")} / {LIMITS.document.toLocaleString("ko-KR")}자</span>
            </div>
          </>
        )}

        <div className="actions">
          <button type="submit" className="primary we-go" disabled={busy}>
            {busy ? <Loader2 size={14} className="we-spin" /> : mode === "generate" ? <PenLine size={14} /> : <ScanSearch size={14} />}
            {busy ? (mode === "generate" ? "초안 작성 중…" : "여는 중…") : mode === "generate" ? "초안 생성하기" : "에디터에서 분석하기"}
          </button>
          {busy && mode === "generate" && <span className="muted" role="status">{elapsed}초 경과 — 보통 10~40초 걸립니다{useInternet ? "(검색 사용 시 더 걸릴 수 있습니다)" : ""}.</span>}
        </div>
        {problem && (
          <p role="alert" className="lp-alert">
            <span>{problem.message}</span>
            {problem.needKey && <a className="button" href="/settings">키 등록하러 가기</a>}
          </p>
        )}
      </form>
    </section>
  );
}
