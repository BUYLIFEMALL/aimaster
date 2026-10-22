"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ClipboardCopy, Download, FileText, ImageIcon, Loader2, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import type { Audience, BorderStyle, ImageSet, Inputs, Opt, ProjectDoc, RefDoc, Strategy, SubjectType } from "@/lib/tmb/types";
import { AGES, EMPTY_SET, ETHNICITIES, OPTS } from "@/lib/tmb/types";
import { AUDIENCES } from "@/lib/tmb/audience";
import { changedTextLine, lengthConfirmText, mainWarning, subWarning, textChanged } from "@/lib/tmb/strategy";
import { DOC_MAX_CHARS, charsLabel, missingInputs } from "@/lib/tmb/validate";

interface ApiErr { error?: string; needKey?: boolean }
type Busy = Record<"strategy" | Opt, "" | "gen" | "edit">;
const IDLE: Busy = { strategy: "", a: "", b: "" };
// v1.13 세로 결과 칸 — 너무 길어지지 않게 높이를 제한하고 가운데
/** v1.17 세로 결과 → YOUTUBE Shots 자동화 영상 포스팅(릴스 표지 올리기, v1.35). 안내 링크만 — 프로그램끼리 직접 호출하지 않음 */
const SHOTS_POSTING_URL = "https://shots.buylife.xyz/videos";
/** 쇼츠 맞춤 썸네일은 컴퓨터의 YouTube 스튜디오에서만 추가(YouTube 도움말 72431, 2026-10-22 확인 — API 지정은 공식 미확인이라 안내만) */
const YT_STUDIO_URL = "https://studio.youtube.com";
const VERTICAL_CANVAS ={ aspectRatio: "9 / 16", height: "min(70vh, 640px)", width: "auto", maxWidth: "100%", marginInline: "auto" } as const;
const LABEL: Record<Opt, string> = { a: "A안", b: "B안" };

async function call<T>(url: string, method: string, body?: unknown, signal?: AbortSignal): Promise<{ ok: true; data: T } | { ok: false; error: string; needKey: boolean }> {
  try {
    const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, signal });
    const data = (await res.json().catch(() => ({}))) as T & ApiErr;
    if (!res.ok) return { ok: false, error: data.error ?? "요청을 처리하지 못했습니다.", needKey: !!data.needKey };
    return { ok: true, data };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return { ok: false, error: "취소했습니다.", needKey: false };
    return { ok: false, error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", needKey: false };
  }
}

async function saveImage(url: string, name: string) {
  try {
    const blob = await (await fetch(url)).blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1500);
  } catch { window.open(url, "_blank", "noopener"); }
}

interface Props {
  projectId: string;
  initialName: string;
  initialDoc: ProjectDoc;
  initialImages: { a: ImageSet; b: ImageSet };
  initialUrls: Record<string, string>;
}

export function Studio({ projectId, initialName, initialDoc, initialImages, initialUrls }: Props) {
  const [name, setName] = useState(initialName);
  const [inputs, setInputs] = useState<Inputs>(initialDoc.inputs);
  const [strategy, setStrategy] = useState<Strategy | null>(initialDoc.strategy);
  const [sets, setSets] = useState<{ a: ImageSet; b: ImageSet }>(initialImages);
  const [urls, setUrls] = useState<Record<string, string>>(initialUrls);
  const [busy, setBusy] = useState<Busy>(IDLE);
  const [error, setError] = useState<{ text: string; needKey: boolean } | null>(null);
  const [notice, setNotice] = useState("");
  // v1.12 참고 문서는 inputs.doc에 두어 자동 저장(PUT)으로 프로젝트와 함께 저장 — 다시 열어도 그대로
  const doc = inputs.doc ?? null;
  const setDoc = (d: RefDoc | null) => setInputs((p) => {
    const next = { ...p };
    delete next.doc;
    return d ? { ...next, doc: d } : next;
  });
  const [edit, setEdit] = useState<Record<Opt, string>>({ a: "", b: "" });
  const [copied, setCopied] = useState("");
  const [saved, setSaved] = useState<"saved" | "saving" | "error">("saved");
  const aborts = useRef<AbortController[]>([]);
  const first = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Inputs>(key: K, value: Inputs[K]) => setInputs((p) => ({ ...p, [key]: value }));
  const setSubject = (patch: Partial<Inputs["subject"]>) => setInputs((p) => ({ ...p, subject: { ...p.subject, ...patch } }));
  const setStyle = (patch: Partial<Inputs["style"]>) => setInputs((p) => ({ ...p, style: { ...p.style, ...patch } }));

  // 자동 저장(변경 후 1.2초). 이미지는 생성/수정 API가 직접 저장한다.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved("saving");
    const t = setTimeout(async () => {
      const r = await call(`/api/projects/${projectId}`, "PUT", { name, inputs, strategy });
      setSaved(r.ok ? "saved" : "error");
    }, 1200);
    return () => clearTimeout(t);
  }, [name, inputs, strategy, projectId]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (saved === "saving") { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [saved]);

  const fail = useCallback((r: { error: string; needKey: boolean }) => setError({ text: r.error, needKey: r.needKey }), []);

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(txt|md|csv)$/i.test(file.name) && !file.type.startsWith("text/")) { setError({ text: "텍스트 문서(.txt, .md, .csv)만 올릴 수 있습니다.", needKey: false }); return; }
    if (file.size > 2 * 1024 * 1024) { setError({ text: "문서는 2MB 이하만 올릴 수 있습니다.", needKey: false }); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setDoc({ name: file.name, text: text.slice(0, DOC_MAX_CHARS), truncated: text.length > DOC_MAX_CHARS });
      setError(null);
    };
    reader.readAsText(file);
  }

  async function makeStrategy(again: boolean) {
    const miss = missingInputs(inputs);
    if (miss) { setError({ text: miss, needKey: false }); return; }
    setError(null); setNotice("");
    setBusy((b) => ({ ...b, strategy: "gen" }));
    const r = await call<{ strategy: Strategy; docTruncated: boolean }>("/api/strategy", "POST", {
      inputs, docText: doc?.text ?? "", avoid: again && strategy ? [strategy.a.main, strategy.b.main] : undefined,
    });
    setBusy((b) => ({ ...b, strategy: "" }));
    if (!r.ok) { fail(r); return; }
    setStrategy(r.data.strategy);
    if (r.data.docTruncated) setNotice(`대본이 길어 앞 ${DOC_MAX_CHARS.toLocaleString()}자만 분석했습니다.`);
    setTimeout(() => document.getElementById("strategy")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function makeImage(opt: Opt) {
    if (!strategy) return;
    setError(null);
    setBusy((b) => ({ ...b, [opt]: "gen" }));
    const ctl = new AbortController();
    aborts.current.push(ctl);
    const r = await call<{ set: ImageSet; urls: Record<string, string> }>("/api/generate", "POST", { projectId, option: opt, inputs, strategy }, ctl.signal);
    aborts.current = aborts.current.filter((c) => c !== ctl);
    setBusy((b) => ({ ...b, [opt]: "" }));
    if (!r.ok) { fail(r); return; }
    setSets((s) => ({ ...s, [opt]: r.data.set }));
    setUrls((u) => ({ ...u, ...r.data.urls }));
  }

  async function makeBoth() {
    if (!strategy) return;
    const warn = mainWarning(strategy.a.main) || mainWarning(strategy.b.main);
    if (!strategy.a.main.trim() || !strategy.b.main.trim()) { setError({ text: warn ?? "메인 문구를 입력해 주세요.", needKey: false }); return; }
    const ask = lengthConfirmText([strategy.a, strategy.b], inputs.style.ratio);
    if (ask && !window.confirm(ask)) return;
    setNotice("");
    setTimeout(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    await Promise.all(OPTS.map((o) => makeImage(o)));
  }

  async function editImage(opt: Opt) {
    const instruction = edit[opt].trim();
    if (!instruction) return;
    setError(null);
    setBusy((b) => ({ ...b, [opt]: "edit" }));
    const r = await call<{ set: ImageSet; urls: Record<string, string> }>("/api/edit", "POST", { projectId, option: opt, instruction });
    setBusy((b) => ({ ...b, [opt]: "" }));
    if (!r.ok) { fail(r); return; }
    setSets((s) => ({ ...s, [opt]: r.data.set }));
    setUrls((u) => ({ ...u, ...r.data.urls }));
    setEdit((e) => ({ ...e, [opt]: "" }));
  }

  async function revert(opt: Opt, cur: number) {
    const r = await call<{ set: ImageSet }>(`/api/projects/${projectId}`, "PATCH", { option: opt, cur });
    if (!r.ok) { fail(r); return; }
    setSets((s) => ({ ...s, [opt]: r.data.set }));
  }

  async function copy(key: string, text: string) {
    try { await navigator.clipboard.writeText(text); } catch { /* 선택 복사 불가 환경 */ }
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? "" : c)), 1800);
  }

  const updateOpt = (opt: Opt, patch: Partial<Strategy["a"]>) =>
    setStrategy((s) => (s ? { ...s, [opt]: { ...s[opt], ...patch } } : s));

  const anyImage = sets.a.versions.length > 0 || sets.b.versions.length > 0;
  const anyBusy = busy.a !== "" || busy.b !== "";
  const showResult = anyImage || anyBusy;
  const subjectType = inputs.subject.type;

  return (
    <div className="tm">
      <div className="tm-head">
        <input className="tm-name" aria-label="프로젝트 이름" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <span className={`tm-save ${saved === "error" ? "error" : ""}`}>{saved === "saved" ? "저장됨" : saved === "saving" ? "저장 중…" : "저장 실패"}</span>
      </div>

      {error && (
        <div className="lp-alert" role="alert">
          <span>{error.text}{error.needKey && <> <a href="/settings" style={{ textDecoration: "underline" }}>API키등록·플랫폼연동 열기</a></>}</span>
          <button type="button" aria-label="닫기" onClick={() => setError(null)}><X size={16} /></button>
        </div>
      )}
      {notice && <div className="notice">{notice}</div>}

      <section className="card tm-step" id="topic">
        <h2><span className="gd-num">1</span> 주제 · 피사체</h2>
        {inputs.origin && <p className="eyebrow" style={{ marginTop: -4 }}>🔗 {inputs.origin}에서 시작한 프로젝트</p>}
        <label className="tm-field">영상 주제 또는 요청사항
          <textarea rows={3} value={inputs.topic} maxLength={600} onChange={(e) => set("topic", e.target.value)} placeholder="예: 집에서 만드는 초간단 알리오올리오 파스타 레시피" />
        </label>
        <div className="actions" style={{ marginTop: 10 }}>
          <input ref={fileRef} type="file" hidden accept=".txt,.md,.csv,text/plain,text/markdown,text/csv" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" onClick={() => fileRef.current?.click()}><FileText size={14} />대본 문서 올리기 (.txt .md .csv)</button>
          {doc && (
            <span className="tm-doc">
              {doc.name} · {charsLabel(doc.text.length)}{doc.truncated ? " (앞 3만 자만 사용)" : ""}
              <button type="button" aria-label="문서 제거" onClick={() => setDoc(null)}><X size={12} /></button>
            </span>
          )}
        </div>

        <h3 className="tm-sub">썸네일에 등장할 피사체</h3>
        <div className="tm-seg" role="group" aria-label="피사체 종류">
          {([["person", "사람"], ["animal", "동물"], ["object", "사물"], ["none", "없음 (글자·그래픽 위주)"]] as [SubjectType, string][]).map(([v, l]) => (
            <button key={v} type="button" aria-pressed={subjectType === v} onClick={() => setSubject({ type: v })}>{l}</button>
          ))}
        </div>
        {subjectType === "person" && (
          <div className="tm-grid3">
            <label className="tm-field">성별
              <select value={inputs.subject.gender} onChange={(e) => setSubject({ gender: e.target.value as Inputs["subject"]["gender"] })}>
                <option value="auto">자동 (주제에 맞게)</option><option value="female">여성</option><option value="male">남성</option>
              </select>
            </label>
            <label className="tm-field">연령대
              <select value={inputs.subject.age} onChange={(e) => setSubject({ age: e.target.value })}>{AGES.map((a) => <option key={a}>{a}</option>)}</select>
            </label>
            <label className="tm-field">인종 / 국적
              <select value={inputs.subject.ethnicity} onChange={(e) => setSubject({ ethnicity: e.target.value })}>{ETHNICITIES.map((a) => <option key={a}>{a}</option>)}</select>
            </label>
          </div>
        )}
        {(subjectType === "animal" || subjectType === "object") && (
          <label className="tm-field" style={{ marginTop: 10 }}>{subjectType === "animal" ? "동물 종류" : "사물 종류"}
            <input value={inputs.subject.description} maxLength={120} onChange={(e) => setSubject({ description: e.target.value })}
              placeholder={subjectType === "animal" ? "예: 귀여운 골든 리트리버, 화난 고양이" : "예: 최신형 아이폰, 맛있는 파스타 접시"} />
          </label>
        )}
      </section>

      <section className="card tm-step" id="strategy">
        <h2><span className="gd-num">2</span> 타겟 · 전략</h2>
        <div className="tm-aud" role="radiogroup" aria-label="주요 시청 타겟">
          {AUDIENCES.map((a) => (
            <button key={a.id} type="button" role="radio" aria-checked={inputs.audience === a.id} aria-pressed={inputs.audience === a.id} onClick={() => set("audience", a.id as Audience)}>
              <strong>{a.label}</strong><small>{a.desc}</small>
            </button>
          ))}
        </div>
        <div className="actions" style={{ marginTop: 14 }}>
          <button type="button" className="primary" disabled={busy.strategy !== ""} onClick={() => void makeStrategy(false)}>
            {busy.strategy ? <Loader2 size={15} className="ls-spin" /> : <Sparkles size={15} />}
            {busy.strategy ? "전략 분석 중…" : strategy ? "전략 새로 만들기" : "전략 생성"}
          </button>
          {strategy && <button type="button" disabled={busy.strategy !== ""} onClick={() => void makeStrategy(true)}><RefreshCw size={14} />다른 문구로 다시 제안</button>}
        </div>

        {strategy && (
          <div className="tm-strategy">
            <div className="notice"><b>전략 분석 요약</b><p style={{ marginTop: 6 }}>{strategy.summary}</p></div>
            <div className="tm-opts">
              {OPTS.map((o) => {
                const t = strategy[o];
                const warn = mainWarning(t.main, inputs.style.ratio);
                const subWarn = subWarning(t.sub, inputs.style.ratio);
                return (
                  <article key={o} className="tm-opt">
                    <h4><span className={`tm-badge ${o}`}>{LABEL[o]}</span> {t.label}</h4>
                    <label className="tm-field">메인 문구
                      <input value={t.main} maxLength={60} onChange={(e) => updateOpt(o, { main: e.target.value })} />
                    </label>
                    {warn && <small className="tm-warn">{warn}</small>}
                    <label className="tm-field">서브 문구
                      <input value={t.sub} maxLength={80} onChange={(e) => updateOpt(o, { sub: e.target.value })} />
                    </label>
                    {subWarn && <small className="tm-warn">{subWarn}</small>}
                    <label className="tm-field">스타일 제안
                      <input value={t.styleHint} maxLength={200} onChange={(e) => updateOpt(o, { styleHint: e.target.value })} />
                    </label>
                  </article>
                );
              })}
            </div>

            <h3 className="tm-sub">추가 스타일</h3>
            <div className="tm-grid3">
              <label className="tm-field">테두리
                <select value={inputs.style.border} onChange={(e) => setStyle({ border: e.target.value as BorderStyle })}>
                  <option value="none">없음</option><option value="solid">단색 강조</option><option value="neon">네온 글로우</option><option value="sketch">손그림/낙서</option>
                </select>
              </label>
              <label className="tm-field">채널명 표시 (선택)
                <input value={inputs.style.channelName} maxLength={30} onChange={(e) => setStyle({ channelName: e.target.value })} placeholder="예: GPTPARK" />
              </label>
              <label className="tm-field">해상도
                <select value={inputs.style.size} onChange={(e) => setStyle({ size: e.target.value === "1K" ? "1K" : "2K" })}>
                  <option value="2K">2K (고화질, 느림)</option><option value="1K">1K (빠름)</option>
                </select>
              </label>
              {/* v1.13 세로 9:16 — 쇼츠·릴스 표지 */}
              <label className="tm-field">화면 비율
                <select value={inputs.style.ratio} onChange={(e) => setStyle({ ratio: e.target.value === "9:16" ? "9:16" : "16:9" })}>
                  <option value="16:9">가로 16:9 (유튜브 썸네일)</option><option value="9:16">세로 9:16 (쇼츠·릴스 표지)</option>
                </select>
              </label>
            </div>
            <label className="tm-check"><input type="checkbox" checked={inputs.style.withText} onChange={(e) => setStyle({ withText: e.target.checked })} />이미지에 문구를 직접 넣기 (해제하면 글자 없이 배경만 생성)</label>

            <div className="tm-prompt">
              <div className="tm-prompt-head">
                <b>이미지 프롬프트</b>
                <button type="button" onClick={() => void copy("kr", strategy.imagePromptKo)}>{copied === "kr" ? <Check size={13} /> : <ClipboardCopy size={13} />}{copied === "kr" ? "복사됨" : "한국어 복사"}</button>
              </div>
              <p className="muted">{strategy.imagePromptKo}</p>
              <label className="tm-field">영어 프롬프트 (이미지 생성에 쓰이며 직접 수정할 수 있습니다)
                <textarea rows={3} value={strategy.imagePrompt} maxLength={1500} onChange={(e) => setStrategy((s) => (s ? { ...s, imagePrompt: e.target.value } : s))} />
              </label>
            </div>

            <div className="actions" style={{ marginTop: 14 }}>
              <button type="button" className="primary" disabled={anyBusy} onClick={() => void makeBoth()}>
                {anyBusy ? <Loader2 size={15} className="ls-spin" /> : <ImageIcon size={15} />}
                {anyBusy ? "썸네일 생성 중…" : anyImage ? "썸네일 2종 다시 생성" : "썸네일 2종 생성하기"}
              </button>
              <small>이미지 2건을 생성합니다(본인 Gemini 키 사용량). 보통 20~60초 걸립니다.</small>
            </div>
          </div>
        )}
      </section>

      {showResult && strategy && (
        <section className="card tm-step" id="result">
          <h2><span className="gd-num">3</span> 생성 결과 · 수정</h2>
          <div className="tm-results">
            {OPTS.map((o) => {
              const s = sets[o] ?? EMPTY_SET;
              const cur = s.versions[s.cur];
              const url = cur ? urls[cur.path] : undefined;
              const b = busy[o];
              return (
                <div key={o} className="tm-result" data-opt={o}>
                  <div className="tm-result-head"><span className={`tm-badge ${o}`}>{LABEL[o]}</span> <b>{strategy[o].main}</b></div>
                  <div className="tm-canvas" style={inputs.style.ratio === "9:16" ? VERTICAL_CANVAS : undefined}>
                    {url ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={url} alt={`썸네일 ${LABEL[o]}`} /> : <div className="tm-empty">{b ? "" : "아직 생성되지 않았습니다."}</div>}
                    {b && <div className="tm-overlay"><Loader2 className="ls-spin" /><span>{b === "gen" ? "썸네일 생성 중…" : "수정 반영 중…"}</span></div>}
                  </div>
                  {!b && textChanged(cur, strategy[o]) && (
                    <small className="tm-warn" role="status">문구가 바뀌었습니다 — [다시 생성]을 누르면 새 문구로 만듭니다.<br />{changedTextLine(cur, strategy[o])}</small>
                  )}
                  {s.versions.length > 1 && (
                    <div className="tm-versions" aria-label="버전">
                      {s.versions.map((v, i) => (
                        <button key={v.path} type="button" aria-pressed={i === s.cur} title={v.instruction ?? "처음 생성"} onClick={() => void revert(o, i)}>v{v.v}</button>
                      ))}
                    </div>
                  )}
                  <div className="actions">
                    <button type="button" disabled={!url || b !== ""} onClick={() => url && void saveImage(url, `thumbnail_option_${o.toUpperCase()}.jpg`)}><Download size={14} />다운로드 (JPG)</button>
                    <button type="button" disabled={b !== ""} onClick={() => void makeImage(o)}><RefreshCw size={14} />다시 생성</button>
                  </div>
                  {url && inputs.style.ratio === "9:16" && (
                    <small className="muted">
                      릴스 표지로 쓰려면 JPG를 받은 뒤 YOUTUBE Shots 자동화 [영상 포스팅] → 인스타 칸 「표지 이미지」에 올리세요.{" "}
                      <a href={SHOTS_POSTING_URL} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", textDecoration: "underline", fontWeight: 600 }}>릴스 표지로 쓰기 ↗</a>
                      <br />
                      유튜브 쇼츠 표지는 컴퓨터의 YouTube 스튜디오 → 콘텐츠 → Shorts → 영상 세부정보 → 썸네일에서 이 JPG를 올리세요(인증된 계정만, 앱에서는 영상 속 장면만 고를 수 있음).{" "}
                      <a href={YT_STUDIO_URL} target="_blank" rel="noreferrer" style={{ color: "var(--brand)", textDecoration: "underline", fontWeight: 600 }}>YouTube 스튜디오 열기 ↗</a>
                    </small>
                  )}
                  {cur && (
                    <div className="tm-edit">
                      <label>AI 수정 요청 <small>(지시문대로 전체를 다시 그리며, 이전 버전은 유지됩니다)</small></label>
                      <div className="tm-row">
                        <input value={edit[o]} maxLength={300} disabled={b !== ""} placeholder="예: 텍스트를 노란색으로 바꿔줘, 표정을 더 놀라게 해줘"
                          onChange={(e) => setEdit((x) => ({ ...x, [o]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") void editImage(o); }} />
                        <button type="button" className="primary" disabled={b !== "" || !edit[o].trim()} onClick={() => void editImage(o)}><Wand2 size={14} />수정</button>
                      </div>
                      {cur.model && <small className="muted">생성 모델: {cur.model}</small>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
