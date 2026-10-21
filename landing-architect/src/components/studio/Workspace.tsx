"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ClipboardCopy, Download, FileCode2, Loader2, Monitor, RefreshCw, Smartphone, Sparkles, Tablet, Wand2, X } from "lucide-react";
import type { Inputs, Plan, PlanSection, ProjectDoc } from "@/lib/lpa/types";
import { PLAN_SECTIONS } from "@/lib/lpa/types";
import { LAYOUT_LABELS, TEMPLATES, templateById } from "@/lib/lpa/templates";
import { normalizeSection, planToMarkdown } from "@/lib/lpa/plan";
import { CONVERT_PROMPT, extractImageKeywords, fallbackPicsum, replaceImages } from "@/lib/lpa/html";

type Device = "mobile" | "tablet" | "desktop";
type Busy = "" | "suggest" | "plan" | "section" | "code" | "images";
const DEVICE_W: Record<Device, string> = { mobile: "390px", tablet: "768px", desktop: "100%" };

interface ApiError { error?: string; needKey?: boolean | string }

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<{ ok: true; data: T } | { ok: false; error: string; needKey: boolean }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
    const data = (await res.json().catch(() => ({}))) as T & ApiError;
    if (!res.ok) return { ok: false, error: data.error ?? "요청을 처리하지 못했습니다.", needKey: !!data.needKey };
    return { ok: true, data };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") return { ok: false, error: "취소했습니다.", needKey: false };
    return { ok: false, error: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", needKey: false };
  }
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Workspace({ projectId, initialName, initialDoc, initialUpdatedAt }: { projectId: string; initialName: string; initialDoc: ProjectDoc; initialUpdatedAt: string }) {
  const [name, setName] = useState(initialName);
  const [inputs, setInputs] = useState<Inputs>(initialDoc.inputs);
  const [plan, setPlan] = useState<Plan | null>(initialDoc.plan);
  const [html, setHtml] = useState(() => fallbackPicsum(initialDoc.html)); // 이전 버전(v1.01~02)에서 저장한 loremflickr 주소도 열 때 대체
  const [busy, setBusy] = useState<Busy>("");
  const [error, setError] = useState("");
  const [sendingCanvas, setSendingCanvas] = useState(false);

  // 「🧩 UI Canvas로 보내 다듬기」(2026-10-21 v1.11): 기획안을 UI Canvas 새 프로젝트로 만들고 새 창에서 연다(AI 호출 없음)
  const sendToCanvas = async () => {
    if (!plan) return;
    setSendingCanvas(true);
    setError("");
    const win = window.open("about:blank", "_blank"); // 팝업 차단을 피하려고 누른 순간 창을 연다
    try {
      const res = await fetch("/api/canvas-export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, plan }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? "UI Canvas로 보내지 못했습니다.");
      setNotice(data.subPages > 0
        ? `UI Canvas에 메인 페이지와 서브 페이지 ${data.subPages}개를 각각 프로젝트로 만들었습니다. 메인 페이지를 새 창으로 엽니다(서브 페이지는 UI Canvas [내 프로젝트]에 있습니다).`
        : "UI Canvas에 메인 페이지 프로젝트를 만들었습니다. 새 창으로 엽니다.");
      if (win) win.location.href = data.url; else window.location.assign(data.url);
    } catch (e) {
      win?.close();
      setError(e instanceof Error ? e.message : "UI Canvas로 보내지 못했습니다.");
    } finally {
      setSendingCanvas(false);
    }
  };
  const [needKey, setNeedKey] = useState(false);
  const [notice, setNotice] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [saved, setSaved] = useState<"saved" | "saving" | "error" | "conflict">("saved");
  const [copied, setCopied] = useState("");
  const [editing, setEditing] = useState<Partial<Record<PlanSection, string>>>({});
  const [editErr, setEditErr] = useState<Partial<Record<PlanSection, string>>>({});
  const updatedAt = useRef(initialUpdatedAt);
  const dirty = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const first = useRef(true);

  // 자동 저장(변경 후 1.2초)
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    dirty.current = true;
    setSaved("saving");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, doc: { inputs, plan, html }, expectedUpdatedAt: updatedAt.current }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 409) { setSaved("conflict"); return; }
        if (!res.ok) { setSaved("error"); return; }
        updatedAt.current = data.project.updated_at;
        dirty.current = false;
        setSaved("saved");
      } catch { setSaved("error"); }
    }, 1200);
    return () => clearTimeout(t);
  }, [name, inputs, plan, html, projectId]);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) => setInputs((p) => ({ ...p, [k]: v }));
  const tpl = templateById(inputs.templateId);
  const fail = (r: { error: string; needKey: boolean }) => { setError(r.error); setNeedKey(r.needKey); };
  const begin = (b: Busy) => { setBusy(b); setError(""); setNeedKey(false); setNotice(""); abort.current = new AbortController(); return abort.current.signal; };
  const end = () => { setBusy(""); abort.current = null; };

  async function suggest() {
    if (!inputs.topic.trim()) { setError("주제를 먼저 입력해 주세요."); return; }
    const s = begin("suggest");
    const r = await post<{ target: string; goal: string }>("/api/ai/suggest", { topic: inputs.topic }, s);
    end();
    if (!r.ok) return fail(r);
    setInputs((p) => ({ ...p, target: r.data.target, goal: r.data.goal }));
  }

  async function makePlan() {
    if (!inputs.topic.trim() || !inputs.target.trim() || !inputs.goal.trim()) { setError("주제·타겟·목표를 모두 입력해 주세요."); return; }
    const s = begin("plan");
    const r = await post<{ plan: Plan }>("/api/ai/plan", { inputs }, s);
    end();
    if (!r.ok) return fail(r);
    setPlan(r.data.plan); setHtml(""); setEditing({}); setEditErr({});
    if (!name || name === "제목 없는 기획") setName(inputs.topic.slice(0, 40));
  }

  async function remake(section: PlanSection) {
    if (!plan) return;
    const s = begin("section");
    const r = await post<{ section: PlanSection; value: Plan[PlanSection] }>("/api/ai/plan", { inputs, plan, section }, s);
    end();
    if (!r.ok) return fail(r);
    setPlan({ ...plan, [section]: r.data.value } as Plan);
    setEditing((e) => { const n = { ...e }; delete n[section]; return n; });
    setNotice("섹션을 다시 만들었습니다. 프로토타입은 [프로토타입 만들기]로 새로 생성해야 반영됩니다.");
  }

  function applyEdit(section: PlanSection) {
    if (!plan) return;
    try {
      const value = normalizeSection(section, JSON.parse(editing[section] ?? ""), plan.projectInfo.layoutType);
      if (!value) throw new Error();
      setPlan({ ...plan, [section]: value } as Plan);
      setEditing((e) => { const n = { ...e }; delete n[section]; return n; });
      setEditErr((e) => ({ ...e, [section]: undefined }));
    } catch {
      setEditErr((e) => ({ ...e, [section]: "JSON 형식이 올바르지 않습니다. 따옴표와 쉼표를 확인해 주세요." }));
    }
  }

  async function applyImages(source: string, provider = inputs.imageProvider) {
    if (provider === "loremflickr") return fallbackPicsum(source);
    const keywords = extractImageKeywords(source);
    if (!keywords.length) return source;
    const r = await post<{ urls: Record<string, string>; failed: string[] }>("/api/images/resolve", { provider, keywords });
    if (!r.ok) { fail(r); return fallbackPicsum(source); }
    if (r.data.failed.length) setNotice(`일부 이미지(${r.data.failed.length}개)는 찾지 못해 무료 임의 사진으로 대체했습니다.`);
    return fallbackPicsum(replaceImages(source, r.data.urls));
  }

  async function makeCode() {
    if (!plan) return;
    const s = begin("code");
    const r = await post<{ html: string }>("/api/ai/code", { inputs, plan }, s);
    if (!r.ok) { end(); return fail(r); }
    setBusy("images");
    const withImages = await applyImages(r.data.html);
    end();
    setHtml(withImages);
  }

  async function reapplyImages() {
    if (!html) return;
    begin("images");
    const out = await applyImages(html);
    end();
    setHtml(out);
  }

  async function copy(key: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(""), 1500); } catch { setError("복사하지 못했습니다. 브라우저 권한을 확인해 주세요."); }
  }

  const working = busy !== "";
  const busyLabel = { suggest: "타겟·목표를 제안하는 중…", plan: "기획안을 만드는 중… (30~90초)", section: "섹션을 다시 만드는 중…", code: "프로토타입을 만드는 중… (1~3분)", images: "이미지를 찾는 중…", "": "" }[busy];
  const saveLabel = { saved: "저장됨", saving: "저장 중…", error: "저장 실패 — 다시 시도 중", conflict: "다른 창에서 먼저 저장됨 — 새로고침 필요" }[saved];
  const planJson = useMemo(() => (plan ? JSON.stringify(plan, null, 2) : ""), [plan]);
  const hasKeywords = html ? extractImageKeywords(html).length > 0 : false;

  const onCancel = useCallback(() => abort.current?.abort(), []);

  return (
    <div className="lp">
      <div className="lp-head">
        <input className="lp-name" aria-label="프로젝트 이름" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        <span className={`lp-save ${saved}`} role="status">{saveLabel}</span>
      </div>

      {error && (
        <div className="lp-alert" role="alert">
          <span>{error}{needKey && <> <a href="/settings" style={{ textDecoration: "underline" }}>API키등록·플랫폼연동으로 이동</a></>}</span>
          <button type="button" aria-label="닫기" onClick={() => setError("")}><X size={14} /></button>
        </div>
      )}
      {notice && <div className="notice" role="status">{notice}</div>}
      {working && (
        <div className="lp-busy" role="status"><Loader2 size={16} className="ls-spin" /> {busyLabel}
          {(busy === "plan" || busy === "code" || busy === "section" || busy === "suggest") && <button type="button" onClick={onCancel}>취소</button>}
        </div>
      )}

      {/* 1. 입력 */}
      <section className="card lp-step" id="step-input">
        <h2><span className="gd-num">1</span> 프로젝트 정의</h2>
        <div className="lp-grid">
          <label>주제 예시 선택
            <select value={inputs.templateId} disabled={working} onChange={(e) => {
              const t = TEMPLATES.find((x) => x.id === e.target.value);
              setInputs((p) => ({ ...p, templateId: e.target.value, topic: t && t.id !== "custom" && !p.topic ? t.label : p.topic }));
            }}>
              {TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <small>{tpl.summary} · 레이아웃: {tpl.structure === "Auto-Detect" ? "AI 자동 선택" : LAYOUT_LABELS[tpl.type]}</small>
          </label>
          <label>주제 *
            <div className="ls-row">
              <input value={inputs.topic} maxLength={200} disabled={working} placeholder="예: 동네 필라테스 스튜디오 수강생 모집" onChange={(e) => set("topic", e.target.value)} />
              <button type="button" disabled={working || !inputs.topic.trim()} onClick={suggest} title="주제로 타겟과 목표를 자동 제안"><Wand2 size={14} />타겟/목표 자동 완성</button>
            </div>
          </label>
          <label>타겟 *
            <textarea rows={2} value={inputs.target} maxLength={400} disabled={working} placeholder="예: 30~40대 직장인 여성, 퇴근 후 운동을 원하는 사람" onChange={(e) => set("target", e.target.value)} />
          </label>
          <label>목표 *
            <textarea rows={2} value={inputs.goal} maxLength={400} disabled={working} placeholder="예: 체험 수업 신청 월 30건 달성" onChange={(e) => set("goal", e.target.value)} />
          </label>
          <label>이미지 소스
            <select value={inputs.imageProvider} disabled={working} onChange={(e) => set("imageProvider", e.target.value as Inputs["imageProvider"])}>
              <option value="loremflickr">무료 임의 사진 (키 불필요)</option>
              <option value="unsplash">Unsplash (본인 키)</option>
              <option value="pexels">Pexels (본인 키)</option>
              <option value="pixabay">Pixabay (본인 키)</option>
            </select>
          </label>
          <label>AI 모델
            <select value={inputs.model} disabled={working} onChange={(e) => set("model", e.target.value as Inputs["model"])}>
              <option value="pro">Pro (고품질, 느림)</option>
              <option value="standard">Standard (빠름)</option>
            </select>
          </label>
        </div>
        <div className="actions" style={{ marginTop: 14 }}>
          <button type="button" className="primary" disabled={working} onClick={makePlan}><Sparkles size={15} />{plan ? "기획안 다시 만들기" : "기획안 생성 시작"}</button>
        </div>
      </section>

      {/* 2. 기획안 */}
      {plan && (
        <section className="card lp-step" id="step-plan">
          <div className="ls-head">
            <h2><span className="gd-num">2</span> 기획안</h2>
            <div className="actions">
              <button type="button" onClick={() => copy("json", planJson)}>{copied === "json" ? <Check size={14} /> : <ClipboardCopy size={14} />}JSON 복사</button>
              <button type="button" onClick={() => copy("md", planToMarkdown(plan))}>{copied === "md" ? <Check size={14} /> : <ClipboardCopy size={14} />}Markdown 복사</button>
              <button type="button" onClick={() => download("landing-plan.json", planJson, "application/json")}><Download size={14} />JSON 저장</button>
              <button type="button" disabled={sendingCanvas} onClick={sendToCanvas} title="기획안을 UI Canvas 자동화의 새 프로젝트로 보내 화면을 직접 다듬습니다">
                {sendingCanvas ? <RefreshCw size={14} /> : <span aria-hidden>🧩</span>}UI Canvas로 보내 다듬기
              </button>
            </div>
          </div>
          <div className="lp-summary">
            <div><b>{plan.contentStrategy.headline}</b><span>{plan.contentStrategy.subHeadline}</span></div>
            <div className="lp-swatch">
              {[plan.designSystem.primaryColor, plan.designSystem.secondaryColor, plan.designSystem.backgroundColor].map((c, i) => <i key={i} style={{ background: c }} title={c} />)}
              <small>{LAYOUT_LABELS[plan.projectInfo.layoutType]}</small>
            </div>
          </div>
          <div className="lp-sections">
            {PLAN_SECTIONS.map((s) => {
              const text = editing[s.key];
              const isEditing = text !== undefined;
              return (
                <details key={s.key} className="lp-sec">
                  <summary>{s.label}</summary>
                  <textarea
                    className="lp-json" rows={10} spellCheck={false}
                    value={isEditing ? text : JSON.stringify(plan[s.key], null, 2)}
                    onChange={(e) => setEditing((p) => ({ ...p, [s.key]: e.target.value }))}
                    aria-label={`${s.label} JSON`}
                  />
                  {editErr[s.key] && <p className="error" role="alert">{editErr[s.key]}</p>}
                  <div className="actions">
                    <button type="button" disabled={working || !isEditing} onClick={() => applyEdit(s.key)}>수정 적용</button>
                    <button type="button" disabled={working} onClick={() => remake(s.key)}><RefreshCw size={13} />이 섹션 다시 만들기</button>
                  </div>
                </details>
              );
            })}
          </div>
          <div className="actions" style={{ marginTop: 14 }}>
            <button type="button" className="primary" disabled={working} onClick={makeCode}><FileCode2 size={15} />{html ? "프로토타입 다시 만들기" : "프로토타입 만들기"}</button>
          </div>
        </section>
      )}

      {/* 3. 프로토타입 */}
      {html && (
        <section className="card lp-step" id="step-code">
          <div className="ls-head">
            <h2><span className="gd-num">3</span> 프로토타입</h2>
            <div className="actions">
              <div className="ls-seg" role="group" aria-label="미리보기 폭">
                <button type="button" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}><Smartphone size={14} />모바일</button>
                <button type="button" aria-pressed={device === "tablet"} onClick={() => setDevice("tablet")}><Tablet size={14} />태블릿</button>
                <button type="button" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}><Monitor size={14} />데스크톱</button>
              </div>
              <button type="button" onClick={() => copy("html", html)}>{copied === "html" ? <Check size={14} /> : <ClipboardCopy size={14} />}HTML 복사</button>
              <button type="button" onClick={() => download("landing-page.html", html, "text/html")}><Download size={14} />HTML 다운로드</button>
              {inputs.imageProvider !== "loremflickr" && /picsum\.photos\/seed\//.test(html) && <button type="button" disabled={working} onClick={reapplyImages}><RefreshCw size={13} />이미지 다시 찾기</button>}
            </div>
          </div>
          <div className="lp-preview">
            <iframe title="프로토타입 미리보기" sandbox="allow-scripts" srcDoc={html} style={{ width: DEVICE_W[device] }} />
          </div>
          <div className="notice" style={{ marginTop: 14 }}>
            <strong>다음 단계: React 프로젝트로 변환</strong>
            <p>아래 프롬프트와 HTML을 AI Studio Build 또는 선호하는 코딩 AI에 붙여 넣으면 Vite + React 프로젝트로 변환할 수 있습니다.</p>
            <div className="actions" style={{ marginTop: 8 }}>
              <button type="button" onClick={() => copy("convert", `${CONVERT_PROMPT}\n\n[기획안]\n${planJson}`)}>{copied === "convert" ? <Check size={14} /> : <ClipboardCopy size={14} />}변환 프롬프트 복사(기획안 포함)</button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
