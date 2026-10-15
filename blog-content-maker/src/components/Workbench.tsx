"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { APP_NAME } from "@/lib/version";
import { DEFAULT_BRIEF, DEFAULT_SETTINGS, type Brief, type Draft, type Project, type Source, type Workspace } from "@/lib/types";
import { articleHtml, fingerprint } from "@/lib/content";
import { STEPS } from "./navigation";
import { WriteView, IdeasView } from "./WriteViews";
import { ReviewView, ExportView } from "./ResultViews";
import { ImagesView } from "./ImagesView";
import { SettingsView, GuideView } from "./SettingsView";
export interface ActionResult { project?: Project; titles?: { title: string; keyword: string; reason: string }[]; sources?: Source[]; suggestions?: string; translation?: string; token?: string; analysis?: { title: string; keyword: string; subkeywords: string; summary: string } }
export type RunAction = (action: string, data?: Record<string, unknown>, refresh?: boolean) => Promise<ActionResult | null>;
const INITIAL: Workspace = { projects: [], project: null, revisions: [], assets: [], settings: DEFAULT_SETTINGS, keys: {} };
export function Workbench({ step }: { step: string }) {
  const router = useRouter();
  const query = useSearchParams(), queryId = query.get("project"), selected = useRef<string | null>(null), sequence = useRef(0);
  const [ws, setWs] = useState<Workspace>(INITIAL), [brief, setBrief] = useState<Brief>(DEFAULT_BRIEF), [draft, setDraft] = useState<Draft | null>(null), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(""), [error, setError] = useState(""), [message, setMessage] = useState(""), [search, setSearch] = useState("");
  const current = ws.revisions.find(r => r.id === ws.project?.current_revision_id) || ws.revisions[0];
  const dirty = !!draft && !!current && JSON.stringify([draft.title, draft.body, draft.tags]) !== JSON.stringify([current.data.title, current.data.body, current.data.tags]);
  const load = useCallback(async (id?: string | null) => {
    const turn = ++sequence.current;
    const r = await fetch("/api/workspace" + (id ? `?project=${encodeURIComponent(id)}` : ""), { cache: "no-store" }); const data = await r.json(); if (!r.ok) throw new Error(data.error || "작업을 불러오지 못했습니다.");
    if (turn !== sequence.current) return;
    setWs(data); selected.current = data.project?.id || null; if (selected.current) localStorage.setItem("bcm-active-project", selected.current);
    if (data.project) setBrief(data.project.brief); else setBrief(DEFAULT_BRIEF);
    setDraft(data.revisions.find((r: { id: string }) => r.id === data.project?.current_revision_id)?.data || null); setLoaded(true);
  }, []);
  useEffect(() => { let active = true; Promise.resolve().then(async () => { if (!active) return; const id = queryId || localStorage.getItem("bcm-active-project"); try { await load(id); } catch (e) { if (!active) return; setError((e as Error).message); if (!queryId) { localStorage.removeItem("bcm-active-project"); try { await load(null); } catch { /* Initial error remains visible. */ } } } }); return () => { active = false; }; }, [load, queryId]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    const nav = (e: MouseEvent) => { const anchor = (e.target as Element)?.closest("a[href]") as HTMLAnchorElement | null; if (dirty && anchor && anchor.origin === location.origin && !anchor.download && anchor.target !== "_blank" && anchor.pathname !== location.pathname && !confirm("저장하지 않은 원고 수정이 있습니다. 이 화면을 떠나시겠습니까?")) { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("beforeunload", before); document.addEventListener("click", nav, true); return () => { window.removeEventListener("beforeunload", before); document.removeEventListener("click", nav, true); };
  }, [dirty]);
  const call: RunAction = async (action, data = {}, refresh = true) => {
    if (busy) return null; setBusy(action); setError(""); setMessage("");
    try {
      const r = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, projectId: ws.project?.id, expectedRevision: current?.id || null, requestKey: crypto.randomUUID(), ...data }) });
      const result = await r.json(); if (!r.ok) throw new Error(result.error || "요청을 완료하지 못했습니다.");
      if (action === "delete") { localStorage.removeItem("bcm-active-project"); selected.current = null; router.replace("/library"); }
      if (refresh) await load(result.project?.id || selected.current); setMessage(result.recovered ? "다른 창의 변경을 보존하고 생성 결과를 별도 작업으로 저장했습니다." : action === "generate" ? "원고가 저장됐습니다. 내용을 검토한 뒤 다음 단계로 진행하세요." : "저장된 결과를 확인했습니다."); return result;
    } catch (e) { setError(e instanceof Error ? e.message : "작업 실패"); return null; } finally { setBusy(""); }
  };
  async function newProject() { if (dirty && !confirm("저장하지 않은 수정이 있습니다. 새 작업을 만드시겠습니까?")) return; const result = await call("create", { brief: DEFAULT_BRIEF }); if (result?.project) router.push(`/write?project=${result.project.id}`); }
  const title = STEPS.find(s => s.id === step)!;
  const html = draft ? articleHtml(draft, ws.assets) : "";
  const projectLink = (path: string) => `/${path}${ws.project ? `?project=${ws.project.id}` : ""}`;
  return <>
    <header className="page-heading"><p className="eyebrow">BLOG CONTENT WORKSPACE</p><h1>{title.title}</h1><p className="subtitle">{title.description}</p></header>
    {busy && <div className="notice status" role="status"><span className="progress-dot"/>처리 중입니다. AI 작업은 최대 몇 분 걸릴 수 있으며 결과는 작업 보관함에 저장됩니다.</div>}
    {error && <div className="error status" role="alert">{error}<div><Link href="/settings">API키등록·플랫폼연동 확인 ↗</Link></div></div>}
    {message && !busy && <div className="success" role="status">{message}</div>}
    <div className="card toolbar"><span className="pill">현재 작업</span><select aria-label="작업 선택" value={ws.project?.id || ""} disabled={!!busy || dirty} onChange={e => { load(e.target.value || null).catch(e => setError(e.message)); }}><option value="">작업을 선택하세요</option>{ws.projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select><button onClick={newProject} disabled={!!busy}>＋ 새 작업</button><button disabled={!!busy || dirty} onClick={() => load(selected.current).catch(e => setError(e.message))}>새로고침</button></div>
    {!loaded ? <div className="card empty">회원님의 작업을 불러오고 있습니다.</div> : <div className="stack">
      {step === "dashboard" && <><div className="intro"><p className="eyebrow">생각을 원고로, 원고를 콘텐츠로</p><h2>{APP_NAME}</h2><p>글감과 제목을 고르고, 원고를 다듬고, 이미지를 더하세요.<br/>회원님의 경험과 근거를 확인한 뒤 네이버 편집기로 옮길 수 있습니다.</p><div className="row"><button className="primary" onClick={newProject} disabled={!!busy}>새 콘텐츠 만들기 →</button><Link className="button" href={projectLink("write")}>작성하던 원고 이어가기</Link></div></div><div className="grid three">{[[ws.projects.length, "보관 중인 작업"], [ws.revisions.length, "현재 작업 수정본"], [ws.assets.filter(a => a.kind !== "reference").length, "현재 작업 이미지"]].map(([number, label]) => <div className="card" key={label}><p className="stat">{number}</p><p className="muted">{label}</p></div>)}</div><div className="grid three">{STEPS.slice(1, 6).map(s => <Link className="card workflow-card" href={projectLink(s.id)} key={s.id}><span className="step-number">{s.number}</span><h3>{s.title}</h3><p className="muted compact">{s.description}</p></Link>)}</div><div className="notice">검색 순위·공식 네이버 점수를 보장하지 않습니다. AI 생성 내용의 사실·최신 정보는 직접 확인하고, 최종 발행도 회원님이 진행합니다.</div></>}
      {step === "ideas" && <IdeasView call={call} busy={!!busy} onSelect={async (topic, keyword) => { const b = { ...DEFAULT_BRIEF, topic, keyword }; const r = await call("create", { brief: b }); if (r?.project) router.push(`/write?project=${r.project.id}`); }}/>}
      {step === "write" && <WriteView brief={brief} setBrief={setBrief} project={ws.project} draft={draft} busy={!!busy} call={call} newProject={newProject} onGenerate={async () => { const saved = await call("brief", { brief }, false); if (saved) await call("generate"); }}/>}
      {step === "review" && <ReviewView draft={draft} setDraft={setDraft} currentId={current?.id || ""} assets={ws.assets} brief={brief} dirty={dirty} call={call} busy={!!busy} revisions={ws.revisions}/>}
      {step === "images" && <ImagesView draft={draft} assets={ws.assets} call={call} busy={!!busy}/>}
      {step === "export" && <ExportView project={ws.project} draft={draft} assets={ws.assets} html={html} dirty={dirty} auditFresh={!!draft?.audit && draft.audit.fingerprint === fingerprint(draft, ws.assets)} onError={setError}/>}
      {step === "library" && <div className="card"><div className="row spread"><h2>내 작업 보관함</h2><span className="pill">30일 이용 · 본인 원고만 표시</span></div><label className="field">제목 검색<input value={search} onChange={e => setSearch(e.target.value)} placeholder="찾을 제목을 입력하세요"/></label>{ws.projects.filter(p => p.title.includes(search)).map(p => <div className="list-row row spread" key={p.id}><div><Link href={`/review?project=${p.id}`}><strong>{p.title}</strong></Link><small>{new Date(p.updated_at).toLocaleString("ko-KR")} · {new Date(p.expires_at).toLocaleDateString("ko-KR")}까지</small></div><div className="row"><button disabled={!!busy} onClick={() => call("duplicate", { projectId: p.id })}>복제</button><button disabled={!!busy} onClick={() => { if (confirm(`「${p.title}」의 원문·모든 수정본·이미지를 영구 삭제하시겠습니까?`)) call("delete", { projectId: p.id, confirmTitle: p.title }); }}>삭제</button></div></div>)}{!ws.projects.length && <div className="empty">첫 콘텐츠를 만들어 보세요.</div>}</div>}
      {step === "settings" && <SettingsView settings={ws.settings} keys={ws.keys} call={call} busy={!!busy}/>}
      {step === "guide" && <GuideView/>}
    </div>}
  </>;
}
