"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { workspaceSchema, localDate, PRIORITY_LABELS, MODE_LABELS, type Workspace, type Task, type Mode } from "@/lib/planner/model";
import { activeSession, remainingMs, applyCommand, type Command } from "@/lib/planner/engine";
import { metrics, focusTotals } from "@/lib/planner/metrics";
import { APP_NAME, APP_VERSION, MAIN_SITE } from "@/lib/version";
import { Sidebar, SCREENS } from "./Sidebar";
import { TaskEditor } from "./TaskEditor";
import { Overview, SummaryPanel, ChartPanel, NotePanel, AnalysisPanel } from "./Overview";

const snapshotSchema = z.object({ workspace: workspaceSchema, revision: z.number().int().min(0), userId: z.string(), serverNow: z.number() });
type Snapshot = z.infer<typeof snapshotSchema>;
function message(error: unknown) { return error instanceof Error ? error.message : "요청을 처리하지 못했습니다."; }
function clock(seconds: number) { const s = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; }
export function Planner({ userId, email, initialScreen = "dashboard", children }: { userId: string; email: string; initialScreen?: string; children?: React.ReactNode }) {
  const [screen, setScreen] = useState(initialScreen), [record, setRecord] = useState<Snapshot | null>(null);
  const [date, setDate] = useState(() => localDate(Date.now())), [categoryId, setCategoryId] = useState(""), [query, setQuery] = useState(""), [sort, setSort] = useState("plan");
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [status, setStatus] = useState("불러오는 중…"), [denied, setDenied] = useState(false);
  const [editing, setEditing] = useState<Task | undefined>(), [editorKey, setEditorKey] = useState(0), [categoryName, setCategoryName] = useState("");
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({}), [tick, setTick] = useState(0);
  const lock = useRef(false), currentRecord = useRef<Snapshot | null>(null), clockBase = useRef({ server: Date.now(), monotonic: 0 });
  const pendingRequest = useRef<{ fingerprint: string; body: { commandId: string; revision: number; command: Command } } | null>(null);
  const finished = useRef<string | null>(null);
  const refreshing = useRef(false);
  function now() { return clockBase.current.monotonic ? clockBase.current.server + performance.now() - clockBase.current.monotonic : Date.now(); }
  function accept(raw: unknown) {
    const result = snapshotSchema.parse(raw);
    if (result.userId !== userId) { clearMember(); throw new Error("로그인 계정이 변경됐습니다. 다시 로그인해주세요."); }
    clockBase.current = { server: result.serverNow, monotonic: performance.now() };
    currentRecord.current = result; setRecord(result); setDenied(false);
  }
  function clearMember() { currentRecord.current = null; setRecord(null); setEditing(undefined); setNoteDrafts({}); pendingRequest.current = null; setDenied(true); }
  const refresh = useCallback(async (background = false) => {
    if (lock.current || refreshing.current) return;
    const passive = background && currentRecord.current !== null;
    refreshing.current = true;
    if (!passive) { lock.current = true; setBusy(true); setError(""); }
    try {
      const response = await fetch("/api/workspace", { cache: "no-store", credentials: "same-origin" });
      const data = await response.json();
      // Window focus must not disable a timer click or let a delayed GET replace a newer POST.
      if (passive && lock.current) return;
      if (!response.ok) { if (response.status === 401 || response.status === 403) clearMember(); throw new Error(data.error || "기록을 불러오지 못했습니다."); }
      if (passive && data.userId === userId && data.revision < (currentRecord.current?.revision ?? 0)) return;
      accept(data); setStatus("최신 기록 확인 완료");
    } catch (e) { if (!passive || !lock.current) { setError(message(e)); setStatus("불러오기 실패"); } }
    finally { refreshing.current = false; if (!passive) { lock.current = false; setBusy(false); } }
  // userId is fixed by the authenticated server layout; a change remounts the workspace.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
  useEffect(() => { void refresh(); const handler = () => void refresh(true); window.addEventListener("focus", handler); return () => window.removeEventListener("focus", handler); }, [refresh]);
  useEffect(() => { const timer = window.setInterval(() => setTick(t => t + 1), 500); return () => clearInterval(timer); }, []);
  useEffect(() => { const handler = () => setScreen(window.location.pathname.slice(1) || "dashboard"); window.addEventListener("popstate", handler); return () => window.removeEventListener("popstate", handler); }, []);
  useEffect(() => { const handler = (e: BeforeUnloadEvent) => { const w = currentRecord.current?.workspace; if (lock.current || Object.entries(noteDrafts).some(([day, draft]) => draft !== (w?.notes[day] ?? ""))) { e.preventDefault(); } }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [noteDrafts]);
  async function send(command: Command): Promise<boolean> {
    if (lock.current || !currentRecord.current || denied) return false;
    lock.current = true; setBusy(true); setError(""); setStatus("저장 중…");
    const fingerprint = JSON.stringify(command);
    const revision = currentRecord.current.revision;
    // 응답 유실 뒤 GET으로 최신 revision을 읽어도 같은 요청 ID로 재전송합니다.
    const body = pendingRequest.current?.fingerprint === fingerprint ? pendingRequest.current.body : { commandId: crypto.randomUUID(), revision, command };
    pendingRequest.current = { fingerprint, body };
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) clearMember();
        if (response.status === 409) pendingRequest.current = null;
        throw new Error(data.error || "저장하지 못했습니다.");
      }
      accept(data); pendingRequest.current = null; setStatus("서버 저장 완료"); return true;
    } catch (e) { setError(message(e)); setStatus("저장 실패 · 재시도 필요"); return false; }
    finally { lock.current = false; setBusy(false); }
  }
  const w = record?.workspace, serverNow = now(), active = w ? activeSession(w) : undefined;
  useEffect(() => {
    if (active?.state === "running" && remainingMs(active, now()) === 0 && finished.current !== active.id && !lock.current) {
      finished.current = active.id; void send({ type: "timer.finish", sessionId: active.id });
    }
  // A failed expiry command remains visible and can be retried explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, active?.id, active?.state]);
  function navigate(next: string) { setScreen(next); window.history.pushState(null, "", `/${next}`); }
  async function action(task: Task, type: "task.complete" | "task.undo" | "task.trash" | "task.restore") {
    if (type === "task.trash" && !window.confirm("휴지통으로 이동할까요? 실행 중인 집중 기록은 정산하고 종료합니다.")) return;
    await send({ type, id: task.id });
  }
  const timeTick = active?.state === "running" ? tick : 0;
  const focusMap = useMemo(() => w ? focusTotals(w, serverNow) : new Map<string, number>(), [w, timeTick]);
  const summary = useMemo(() => w ? metrics(w, date, categoryId, query, serverNow, focusMap) : null, [w, date, categoryId, query, focusMap]);
  const list = summary ? [...summary.tasks].sort((a, b) => sort === "priority" ? ["high", "normal", "low"].indexOf(a.priority) - ["high", "normal", "low"].indexOf(b.priority) : sort === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt) : [];
  const label = SCREENS.find(s => s.href === screen)?.label ?? APP_NAME;
  function taskCard(task: Task, trash = false) {
    const category = w!.categories.find(c => c.id === task.categoryId)?.name ?? "기타";
    const priorityClass = task.priority === "high" ? "badge-priority-high" : task.priority === "normal" ? "badge-priority-normal" : "badge-priority-low";
    const isDoing = task.status === "doing";
    const isDone = task.status === "done";
    const actualSeconds = focusMap.get(task.id) ?? 0;
    const actualText = clock(actualSeconds);

    return (
      <article className={`task-row-card ${isDone ? "is-done" : ""} ${isDoing ? "is-doing" : ""}`} key={task.id}>
        <div className="task-row-main">
          <div className="task-row-top">
            <div className="task-title-group">
              <span className={`state-dot ${task.status}`} />
              <strong className="task-title-text">{task.title}</strong>
            </div>
            <div className="task-row-actions">
              {trash ? (
                <button className="row-action-btn restore" disabled={busy} onClick={() => action(task, "task.restore")} title="복원">
                  복원
                </button>
              ) : (
                <>
                  {!isDone && (
                    <button
                      className="row-action-btn timer-btn"
                      disabled={busy || !!active}
                      onClick={async () => {
                        if (await send({ type: "timer.start", mode: "focus", taskId: task.id })) {
                          if (screen !== "dashboard") navigate("focus");
                        }
                      }}
                      title="집중 시작"
                    >
                      {isDoing ? "⏸" : "▶"}
                    </button>
                  )}
                  <button
                    className={`row-action-btn check-btn ${isDone ? "done" : ""}`}
                    disabled={busy}
                    onClick={() => action(task, isDone ? "task.undo" : "task.complete")}
                    title={isDone ? "완료 취소" : "완료"}
                  >
                    {isDone ? "↩" : "✓"}
                  </button>
                  <button
                    className="row-action-btn edit-btn"
                    disabled={busy}
                    onClick={() => {
                      setEditing(task);
                      if (screen !== "dashboard") navigate("plan");
                    }}
                    title="수정"
                  >
                    ✏
                  </button>
                  <button
                    className="row-action-btn delete-btn"
                    disabled={busy}
                    onClick={() => action(task, "task.trash")}
                    title="휴지통"
                  >
                    🗑
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="task-row-meta">
            <span className="task-time-info">
              예상: {task.estimatedMinutes ? `${task.estimatedMinutes}분` : "미설정"} • 실제: {actualText}
            </span>
          </div>

          <div className="task-row-badges">
            <span className={`task-badge ${priorityClass}`}>
              우선순위: {PRIORITY_LABELS[task.priority]}
            </span>
            <span className="task-badge badge-category">
              {category}
            </span>
            {isDoing && <span className="task-badge badge-status-doing">진행중</span>}
            {isDone && <span className="task-badge badge-status-done">완료</span>}
          </div>
        </div>
      </article>
    );
  }
  const scope = date + " (한국 시간) · " + (categoryId ? w?.categories.find(c => c.id === categoryId)?.name : "전체 분류") + (query ? ` · 제목 “${query}”` : "");
  const note = noteDrafts[date] ?? w?.notes[date] ?? "";
  const changeNote = (value: string) => setNoteDrafts(d => ({ ...d, [date]: value }));
  const saveNote = () => { void send({ type: "note.save", date, note }); };
  function editor() { if (!w) return null; return <TaskEditor key={editing?.id ?? `${editorKey}-${w.settings.defaultCategoryId}`} workspace={w} date={date} editing={editing} busy={busy} save={async input => { const ok = await send(editing ? { type: "task.edit", id: editing.id, input } : { type: "task.add", input }); if (ok) { setEditing(undefined); setEditorKey(k => k + 1); } return ok; }} cancel={() => setEditing(undefined)}/>; }
  function backup() {
    if (!w) return;
    let snapshot = structuredClone(w);
    if (active?.state === "running") snapshot = applyCommand(snapshot, { type: "timer.pause", sessionId: active.id }, Math.floor(serverNow));
    const blob = new Blob([JSON.stringify({ program: "ai-task-planner", appVersion: APP_VERSION, exportedAt: new Date(serverNow).toISOString(), workspace: snapshot }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob), a = document.createElement("a"); a.href = url; a.download = `할일-백업-${localDate(serverNow)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="app-shell"><Sidebar email={email} screen={screen} navigate={navigate} busy={busy}/><main className={`main ${screen === "dashboard" ? "overview-main" : ""}`}>
    <header className="page-heading"><div><p className="eyebrow">나의 계획과 집중 기록</p><h1>{label}</h1><p>작은 계획을 실행하고, 기록으로 다음 하루를 준비합니다.</p></div><div className="save-status" role="status">{status}</div></header>
    {error && <div role="alert" className="error-banner"><p>{error}</p><button disabled={busy} onClick={() => void refresh()}>최신 기록 불러오기</button></div>}
    {!w ? <section className="card"><h2>{denied ? "로그인·이용 권한 확인이 필요합니다" : "회원 기록을 불러오고 있습니다"}</h2><p>기록을 확인한 뒤 할 일과 집중시간이 표시됩니다.</p>{denied && <a href="/login" className="button">로그인</a>}</section> : <>
      {!["settings", "guide"].includes(screen) && <div className="filters"><label>기록 날짜<input type="date" value={date} onChange={e => { if (e.target.value) { setDate(e.target.value); setEditing(undefined); setEditorKey(k => k + 1); } }}/></label><label>분류<select value={categoryId} onChange={e => setCategoryId(e.target.value)}><option value="">전체</option>{w.categories.filter(c => !c.archived).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>할 일 검색<input value={query} onChange={e => setQuery(e.target.value)} placeholder="제목에서 검색"/></label><label>정렬<select value={sort} onChange={e => setSort(e.target.value)}><option value="plan">계획 순서</option><option value="priority">우선순위</option><option value="newest">최근 작성</option></select></label></div>}
      {screen === "results" && summary && <SummaryPanel summary={summary} scope={scope}/>}
      {screen === "dashboard" && summary && <Overview workspace={w} tasks={list} summary={summary} scope={scope} categoryId={categoryId} chooseCategory={setCategoryId} active={active} remaining={active ? clock(remainingMs(active, serverNow) / 1000) : "00:00"} busy={busy} command={send} backup={backup} manage={() => navigate("plan")} editor={editor()} taskCard={taskCard} note={note} savedNote={w.notes[date] ?? ""} changeNote={changeNote} saveNote={saveNote} date={date}/>}
      {screen === "plan" && <div className="plan-grid"><div className="stack">{editor()}<section className="card"><h2>분류 관리</h2><form className="actions" onSubmit={async e => { e.preventDefault(); if (await send({ type: "category.add", name: categoryName })) setCategoryName(""); }}><input aria-label="새 분류 이름" value={categoryName} onChange={e => setCategoryName(e.target.value)} maxLength={30} required placeholder="새 분류 이름"/><button disabled={busy}>분류 추가</button></form><div className="chips">{w.categories.filter(c => !c.archived).map(c => <span key={c.id}>{c.name}<button disabled={busy} aria-label={`${c.name} 분류 보관`} onClick={() => send({ type: "category.archive", id: c.id })}>×</button></span>)}</div><p className="muted">전체는 필터 전용입니다. 기록에 사용 중인 분류는 보관할 수 없습니다.</p></section></div><section className="card"><h2>선택 날짜의 할 일 <small>{list.length}개</small></h2>{list.length ? list.map(t => taskCard(t)) : <p className="empty">등록한 할 일이 여기에 표시됩니다.</p>}</section></div>}
      {screen === "focus" && <section className="card timer-card"><p className="eyebrow">{active ? MODE_LABELS[active.mode] : "집중할 준비가 됐나요?"}</p><h2>{active?.taskId ? w.tasks.find(t => t.id === active.taskId)?.title : active ? "잠깐 쉬어가세요" : "할 일을 선택해 시작해주세요"}</h2><div className="timer" aria-label="남은 시간">{active ? clock(remainingMs(active, serverNow) / 1000) : clock(w.settings.durations.focus * 60)}</div><p>{active?.state === "paused" ? "일시정지 · 남은 시간과 집중 기록이 유지됩니다" : active ? "실행 중 · 종료 시각까지만 기록합니다" : "타이머 실행에 AI 키는 필요하지 않습니다"}</p><div className="actions centered">{active ? <><button className="primary" disabled={busy} onClick={() => send({ type: active.state === "paused" ? "timer.resume" : "timer.pause", sessionId: active.id })}>{active.state === "paused" ? "재개" : "일시정지"}</button><button disabled={busy} onClick={() => send({ type: "timer.end", sessionId: active.id })}>현재 타이머 종료</button>{remainingMs(active, serverNow) === 0 && <button disabled={busy} onClick={() => send({ type: "timer.finish", sessionId: active.id })}>종료 기록 다시 저장</button>}</> : <>{(["short", "long"] as Mode[]).map(mode => <button key={mode} disabled={busy} onClick={() => send({ type: "timer.start", mode, taskId: null })}>{MODE_LABELS[mode]} 시작</button>)}<button onClick={() => navigate("plan")}>할 일 선택</button></>}</div><p className="muted">작업 완료·휴지통 이동 시 실행 중인 시간을 정산하고 종료합니다. 다음 모드는 직접 선택합니다.</p></section>}
      {screen === "results" && summary && <div className="plan-grid"><ChartPanel bins={summary.bins}/><NotePanel note={note} savedNote={w.notes[date] ?? ""} busy={busy} change={changeNote} save={saveNote}/><AnalysisPanel/></div>}
      {screen === "records" && <><section className="card"><h2>전체 기록 백업</h2><p>할 일·분류·집중 세션·설정·노트를 JSON 파일로 내려받습니다. 로그인 정보와 API 키는 포함하지 않습니다.</p><button disabled={busy} onClick={backup}>JSON 백업 다운로드</button><p className="muted">백업 복원과 CSV는 다음 구현 단계에서 제공됩니다. 실행 세션은 백업 안에서 정지 상태로 기록됩니다.</p></section><section className="card"><h2>휴지통</h2>{w.tasks.filter(t => t.deletedAt !== null).map(t => taskCard(t, true))}{!w.tasks.some(t => t.deletedAt !== null) && <p className="empty">휴지통이 비어 있습니다.</p>}</section></>}
      {screen === "settings" && <div className="stack"><section className="card"><h2>회원 본인 Gemini API 키</h2><p>본인 키는 AIMaster 공통 설정에 직접 등록해주세요. 운영자나 다른 회원의 키로 대신 호출하지 않습니다.</p><a className="button primary" href={`${MAIN_SITE}/api-settings`}>AIMaster에서 본인 API 키 등록</a><p className="muted">AI 분석·모델 선택은 다음 구현 단계에서 연결합니다. 기본 할 일과 타이머는 AI 호출 없이 사용합니다.</p></section><section className="card"><h2>타이머 설정</h2><form className="stack" onSubmit={async e => { e.preventDefault(); const f = new FormData(e.currentTarget); await send({ type: "settings.save", settings: { ...w.settings, durations: { focus: Number(f.get("focus")), short: Number(f.get("short")), long: Number(f.get("long")) } } }); }}><div className="form-grid">{(["focus", "short", "long"] as Mode[]).map(mode => <label key={mode}>{MODE_LABELS[mode]} (분)<input type="number" name={mode} min={1} max={mode === "focus" ? 180 : mode === "short" ? 60 : 120} step={1} defaultValue={w.settings.durations[mode]} required/></label>)}</div><p className="muted">실행 중 변경한 시간은 다음 세션부터 적용됩니다. 기록 시간대는 한국(Asia/Seoul)입니다.</p><button className="primary" disabled={busy}>타이머 설정 저장</button></form></section><section className="card"><h2>📖 연동 매뉴얼</h2><p>AI 기능 구현 단계에서 본인 Gemini 키 등록 안내와 연동 매뉴얼을 연결합니다.</p></section></div>}
      {screen === "guide" && <section className="card guide"><h2>계획 → 집중 → 성과 → 기록</h2><ol><li><strong>할 일 계획</strong><p>날짜와 분류를 고르고 제목·우선순위·예상시간을 입력합니다. 할 일 추가 후 서버 저장 완료를 확인해주세요.</p></li><li><strong>집중 실행</strong><p>할 일에서 집중 시작을 누릅니다. 일시정지와 재개는 같은 세션을 이어가며 휴식은 집중시간에 포함하지 않습니다.</p></li><li><strong>성과 확인</strong><p>선택한 날짜·분류·검색 범위의 기록을 확인하고 노트를 저장합니다. 측정하지 않은 작업의 정확도는 미측정입니다.</p></li><li><strong>기록 보관</strong><p>휴지통에서 작업을 복원하고 전체 기록을 JSON으로 백업합니다. AI 분석·복원·CSV는 다음 구현 단계입니다.</p></li></ol><p>여러 화면에서 동시에 수정하면 충돌을 안내합니다. 최신 기록을 불러온 뒤 남아 있는 입력을 확인하고 다시 저장해주세요.</p><p>브라우저를 완전히 닫은 상태의 종료 알림은 제공하지 않습니다. 다시 열면 기록된 종료 시각을 기준으로 시간을 확인합니다.</p></section>}
    </>}{children}</main></div>;
}
