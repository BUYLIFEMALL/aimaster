"use client";
import { useState, type ReactNode } from "react";
import { MODE_LABELS, type Mode, type Session, type Task, type Workspace } from "@/lib/planner/model";
import type { Command } from "@/lib/planner/engine";
import type { metrics } from "@/lib/planner/metrics";

type Summary = ReturnType<typeof metrics>;
export function SummaryPanel({ summary, scope, compact = false }: { summary: Summary; scope: string; compact?: boolean }) {
  return <section aria-label="오늘의 성과" className={compact ? "card overview-summary" : "summary-panel"}>
    {compact && <h2>오늘의 성과</h2>}
    <div className="metrics-grid">
      <section className="card metric"><span>완료율</span><strong>{summary.completion}%</strong><small>{summary.completed.length} / {summary.tasks.length}개 계획 완료</small></section>
      <section className="card metric"><span>이 날의 집중시간</span><strong>{Math.floor(summary.focusSeconds / 60)}<em>분</em></strong><small>집중 구간만 합산 · 휴식 제외</small></section>
      <section className="card metric"><span>예측 정확도</span><strong>{summary.accuracy === null ? "미측정" : `${summary.accuracy}%`}</strong><small>실측 완료 작업 {summary.accuracySamples}개</small></section>
      <section className="card metric"><span>성과 참고값</span><strong>{summary.score}<em>점</em></strong><small>{summary.accuracy === null ? "정확도 표본 없음 · 완료율 기준" : "완료율 70% + 정확도 30%"}</small></section>
    </div>
    <p className="muted scope-hint">집계 범위: {scope}. 집중시간은 실행일 기준, 완료율과 정확도는 계획일 기준입니다.</p>
  </section>;
}
export function ChartPanel({ bins }: { bins: number[] }) {
  const maximum = Math.max(1, ...bins);
  return <section className="card"><h2>시간대별 완료 수</h2><p className="muted">선택 날짜·분류·검색 범위 · 한국 시간</p>
    <div className="chart" aria-label="시간대별 완료 수">{bins.map((count, index) => <div key={index}><span>{count}</span><i style={{ height: `${Math.max(3, count / maximum * 80)}px` }}/><small>{index * 2}시</small></div>)}</div>
  </section>;
}
export function NotePanel({ note, savedNote, busy, change, save }: { note: string; savedNote: string; busy: boolean; change: (note: string) => void; save: () => void }) {
  return <section className="card note-panel"><h2>성과 노트</h2><label>하루 돌아보기<textarea maxLength={10000} value={note} onChange={e => change(e.target.value)} placeholder="잘한 일과 다음에 바꿀 점을 적어주세요"/></label>
    <div className="note-footer"><p className="muted">{note === savedNote ? "현재 저장된 내용입니다." : "변경한 내용은 아직 저장하지 않았습니다."}</p><button className="primary" disabled={busy} onClick={save}>노트 저장</button></div>
  </section>;
}
export function AnalysisPanel() {
  return <section className="card analysis-panel"><h2>AI 성과 분석</h2><p className="muted">본인 Gemini 키 분석은 준비 중입니다. 현재 지표는 실제 기록으로 계산합니다.</p><button disabled>AI 분석 준비 중</button></section>;
}
function FocusToolbar({ workspace, tasks, active, remaining, busy, command, backup, manage }: {
  workspace: Workspace; tasks: Task[]; active?: Session; remaining: string; busy: boolean;
  command: (command: Command) => Promise<boolean>; backup: () => void; manage: () => void;
}) {
  const [mode, setMode] = useState<Mode>("focus"), [selected, setSelected] = useState("");
  const currentMode = active?.mode ?? mode;
  const taskId = tasks.some(t => t.id === selected) ? selected : "";
  const currentTitle = active?.taskId ? workspace.tasks.find(t => t.id === active.taskId)?.title : active ? "휴식 중" : "할 일을 선택하고 집중을 시작해주세요";
  return <section className="card overview-toolbar" aria-label="집중 타이머">
    <div className="toolbar-main">
      <div className="mode-buttons" role="group" aria-label="타이머 모드">{(["focus", "short", "long"] as Mode[]).map(value => <button key={value} aria-pressed={currentMode === value} disabled={busy || !!active} onClick={() => setMode(value)}>{MODE_LABELS[value]}</button>)}</div>
      <strong className="overview-clock" aria-label="남은 시간">{active ? remaining : `${String(workspace.settings.durations[mode]).padStart(2, "0")}:00`}</strong>
      {active ? <div className="actions"><button className="primary" disabled={busy} onClick={() => void command({ type: active.state === "paused" ? "timer.resume" : "timer.pause", sessionId: active.id })}>{active.state === "paused" ? "재개" : "일시정지"}</button><button disabled={busy} onClick={() => void command({ type: "timer.end", sessionId: active.id })}>현재 타이머 종료</button>{remaining === "00:00" && <button disabled={busy} onClick={() => void command({ type: "timer.finish", sessionId: active.id })}>종료 기록 다시 저장</button>}</div>
        : <div className="timer-start-controls">{mode === "focus" && <label className="timer-task-picker"><span className="sr-only">집중할 할 일</span><select aria-label="집중할 할 일" value={taskId} onChange={e => setSelected(e.target.value)}><option value="">집중할 할 일 선택</option>{tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>}<button className="primary" disabled={busy || (mode === "focus" && !taskId)} onClick={() => void command({ type: "timer.start", mode, taskId: mode === "focus" ? taskId : null })}>시작</button></div>}
    </div>
    <div className="overview-tools"><button disabled={busy} onClick={backup}>JSON 백업 다운로드</button><button onClick={manage}>분류 관리</button></div>
    <p className="timer-caption"><span className="state-dot"/>{currentTitle}{active && ` · ${active.state === "paused" ? "일시정지" : "실행 중"}`}</p>
  </section>;
}
export function Overview({ workspace, tasks, summary, scope, categoryId, chooseCategory, active, remaining, busy, command, backup, manage, editor, taskCard, note, savedNote, changeNote, saveNote }: {
  workspace: Workspace; tasks: Task[]; summary: Summary; scope: string; categoryId: string; chooseCategory: (id: string) => void;
  active?: Session; remaining: string; busy: boolean; command: (command: Command) => Promise<boolean>; backup: () => void; manage: () => void;
  editor: ReactNode; taskCard: (task: Task) => ReactNode; note: string; savedNote: string; changeNote: (note: string) => void; saveNote: () => void;
}) {
  const pending = tasks.filter(t => t.status !== "done"), completed = tasks.filter(t => t.status === "done");
  return <div className="overview">
    <FocusToolbar workspace={workspace} tasks={pending} active={active} remaining={remaining} busy={busy} command={command} backup={backup} manage={manage}/>
    <div className="overview-grid">
      <section className="card overview-task-list" aria-label="할 일 목록"><h2>할 일 목록 <small>{tasks.length}개</small></h2>
        <div className="category-tabs" role="group" aria-label="분류 빠른 선택"><button aria-pressed={!categoryId} onClick={() => chooseCategory("")}>전체</button>{workspace.categories.filter(c => !c.archived).map(c => <button key={c.id} aria-pressed={categoryId === c.id} onClick={() => chooseCategory(c.id)}>{c.name}</button>)}</div>
        <div className="overview-task-scroll"><section aria-label="미완료·진행중 목록"><h3>미완료·진행중 <small>{pending.length}개</small></h3>{pending.length ? pending.map(task => taskCard(task)) : <p className="empty">미완료 할 일이 없습니다.</p>}</section>
          <section aria-label="완료 목록"><h3>완료 <small>{completed.length}개</small></h3>{completed.length ? completed.map(task => taskCard(task)) : <p className="empty">완료한 할 일이 없습니다.</p>}</section></div>
      </section>
      <div className="overview-planning stack">{editor}<SummaryPanel summary={summary} scope={scope} compact/></div>
      <div className="overview-insights stack"><ChartPanel bins={summary.bins}/><AnalysisPanel/><NotePanel note={note} savedNote={savedNote} busy={busy} change={changeNote} save={saveNote}/></div>
    </div>
  </div>;
}
