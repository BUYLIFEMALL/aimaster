"use client";
import { useState, type ReactNode } from "react";
import { MODE_LABELS, type Mode, type Session, type Task, type Workspace } from "@/lib/planner/model";
import type { Command } from "@/lib/planner/engine";
import type { metrics } from "@/lib/planner/metrics";

import { AnalysisPanel } from "./AnalysisPanel";

type Summary = ReturnType<typeof metrics>;

export function SummaryPanel({ summary, scope, compact = false }: { summary: Summary; scope: string; compact?: boolean }) {
  const completedCount = summary.completed.length;
  const totalCount = summary.tasks.length;
  const completionRate = summary.completion;

  return (
    <section aria-label="오늘의 성과" className={`card ${compact ? "overview-summary" : "summary-panel"}`}>
      <div className="section-header">
        <h2>오늘의 성과</h2>
      </div>

      {/* 완료율 프로그레스 게이지 */}
      <div className="progress-section metric" aria-label="완료율">
        <div className="progress-label-row">
          <span className="progress-title">완료율</span>
          <small className="progress-ratio">{completedCount} / {totalCount}개 계획 완료</small>
        </div>
        <div className="progress-track" role="progressbar" aria-valuenow={completionRate} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }} />
        </div>
        <div className="progress-percent-row">
          <strong className="progress-percent">{completionRate}%</strong>
        </div>
      </div>

      {/* 3분할 성과 지표 서브 카드 */}
      <div className="metrics-grid">
        <div className="metric-box">
          <span className="metric-title">총 집중 시간</span>
          <strong className="metric-number">{Math.floor(summary.focusSeconds / 60)}<em>분</em></strong>
          <small className="metric-sub">실제 타이머 누적</small>
        </div>
        <div className="metric-box">
          <span className="metric-title">예측 정확도</span>
          <strong className="metric-number">{summary.accuracy === null ? "미측정" : `${summary.accuracy}%`}</strong>
          <small className="metric-sub">완료된 예측 작업 기준</small>
        </div>
        <div className="metric-box">
          <span className="metric-title">성과 점수</span>
          <strong className="metric-number">{summary.score}<em>점</em></strong>
          <small className="metric-sub">완료율과 예측 정확도 기반</small>
        </div>
      </div>

      <p className="muted scope-hint">집계 범위: {scope}</p>
    </section>
  );
}

export function ChartPanel({ bins }: { bins: number[] }) {
  const step = Math.max(1, Math.ceil(Math.max(0, ...bins) / 4));
  const maximum = step * 4;
  const timeLabels = ["0시", "2시", "4시", "6시", "8시", "10시", "12시", "14시", "16시", "18시", "20시", "22시"];

  return (
    <section className="card chart-panel">
      <div className="section-header">
        <h2>시간대별 완료 수</h2>
      </div>
      <div className="chart-wrapper">
        <div className="chart-grid-lines">
          {[4, 3, 2, 1, 0].map(value => <span key={value}>{value * step}</span>)}
        </div>
        <div className="chart" aria-label="시간대별 완료 수">
          {bins.map((count, index) => (
            <div key={index} className="chart-col">
              <span className={`col-count ${count > 0 ? "active" : ""}`}>{count}</span>
              <div className="col-bar-track">
                <i
                  className={`col-bar ${count > 0 ? "filled" : ""}`}
                  style={{ height: `${(count / maximum) * 100}%` }}
                />
              </div>
              <small className="col-label">{timeLabels[index] ?? `${index * 2}시`}</small>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NotePanel({
  note,
  savedNote,
  busy,
  change,
  save
}: {
  note: string;
  savedNote: string;
  busy: boolean;
  change: (note: string) => void;
  save: () => void;
}) {
  return (
    <section className="card note-panel">
      <div className="section-header">
        <h2>성과 노트</h2>
        <span className="note-count" aria-live="polite">{note.length.toLocaleString()} / 10,000자</span>
      </div>
      <div className="note-content">
        <textarea
          aria-label="하루 돌아보기"
          maxLength={10000}
          value={note}
          onChange={e => change(e.target.value)}
          placeholder={"오늘 무엇이 잘 됐나요? 내일 개선할 점은?\n\n· 잘한 점\n· 아쉬운 점\n· 내일 가장 먼저 할 일"}
        />
        <div className="note-footer">
          <p className={`note-status-text ${note === savedNote ? "saved" : "dirty"}`}>
            {note === savedNote ? "현재 저장된 내용입니다." : "변경한 내용은 아직 저장하지 않았습니다."}
          </p>
          <button className="primary note-save-btn" disabled={busy} onClick={save}>
            노트 저장
          </button>
        </div>
      </div>
    </section>
  );
}

function FocusToolbar({
  workspace,
  tasks,
  active,
  remaining,
  busy,
  command,
  backup,
  exportCsv,
  manage,
  date
}: {
  workspace: Workspace;
  tasks: Task[];
  active?: Session;
  remaining: string;
  busy: boolean;
  command: (command: Command) => Promise<boolean>;
  backup: () => void;
  exportCsv: () => void;
  manage: () => void;
  date?: string;
}) {
  const [mode, setMode] = useState<Mode>("focus");
  const [selected, setSelected] = useState("");
  const currentMode = active?.mode ?? mode;
  const taskId = tasks.some(t => t.id === selected) ? selected : "";
  const currentTitle = active?.taskId
    ? workspace.tasks.find(t => t.id === active.taskId)?.title
    : active
    ? "휴식 중"
    : "할 일을 선택하고 집중을 시작해주세요";

  // 하루 리셋 (실행 중인 세션 종료 및 알림)
  const handleResetDay = async () => {
    if (active) {
      if (window.confirm("현재 실행 중인 집중 타이머를 종료하고 정산할까요?")) {
        await command({ type: "timer.end", sessionId: active.id });
      }
    } else {
      alert("오늘 등록된 할 일 목록과 성과 지표가 안전하게 유지되고 있습니다.\n새로운 작업을 추가하거나 타이머를 시작해보세요.");
    }
  };

  const modeLabels: Record<Mode, string> = {
    focus: "Focus",
    short: "Short Break",
    long: "Long Break"
  };

  return (
    <section className="card overview-toolbar" aria-label="집중 타이머">
      <div className="toolbar-top-row">
        <div className="toolbar-branding">
          <span className="brand-sparkle">✨</span>
          <h1 className="toolbar-title">오늘의 할 일 &amp; 성과</h1>
        </div>

        <div className="toolbar-center">
          {/* 모드 전환 칩 */}
          <div className="mode-tabs" role="group" aria-label="타이머 모드">
            {(["focus", "short", "long"] as Mode[]).map(value => (
              <button
                key={value}
                className={`mode-tab ${currentMode === value ? "active" : ""}`}
                aria-pressed={currentMode === value}
                aria-label={MODE_LABELS[value]}
                disabled={busy || !!active}
                onClick={() => setMode(value)}
              >
                {modeLabels[value]}
              </button>
            ))}
          </div>

          {/* 대형 타이머 시계 */}
          <strong className="overview-clock" aria-label="남은 시간">
            {active ? remaining : `${String(workspace.settings.durations[mode]).padStart(2, "0")}:00`}
          </strong>

          {/* 시작 / 일시정지 액션 컨트롤 */}
          {active ? (
            <div className="timer-controls">
              <button
                className="timer-action-btn primary"
                disabled={busy}
                onClick={() => void command({ type: active.state === "paused" ? "timer.resume" : "timer.pause", sessionId: active.id })}
              >
                {active.state === "paused" ? "재개" : "일시정지"}
              </button>
              <button
                className="timer-action-btn secondary"
                aria-label="현재 타이머 종료"
                disabled={busy}
                onClick={() => void command({ type: "timer.end", sessionId: active.id })}
              >
                현재 타이머 종료
              </button>
            </div>
          ) : (
            <div className="timer-start-group">
              {mode === "focus" && (
                <div className="timer-task-picker">
                  <select aria-label="집중할 할 일" value={taskId} onChange={e => setSelected(e.target.value)}>
                    <option value="">집중할 할 일 선택</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                className="timer-start-btn"
                aria-label="시작"
                disabled={busy || (mode === "focus" && !taskId)}
                onClick={() => void command({ type: "timer.start", mode, taskId: mode === "focus" ? taskId : null })}
              >
                START
              </button>
            </div>
          )}
        </div>

        {/* 우측 유틸리티 버튼들 */}
        <div className="toolbar-utilities">
          <span className="date-chip">{date || new Date().toISOString().slice(0, 10)}</span>
          <button className="util-btn" disabled={busy} onClick={backup} title="JSON 백업">
            JSON
          </button>
          <button className="util-btn" disabled={busy} onClick={exportCsv} title="CSV 내보내기">
            CSV
          </button>
          <button className="util-btn" onClick={manage}>
            카테고리 관리
          </button>
          <button className="util-btn reset-btn" disabled={busy} onClick={handleResetDay}>
            타이머 정산
          </button>
        </div>
      </div>

      <p className="timer-caption toolbar-caption-row">
        <span className={`state-dot ${active ? (active.state === "paused" ? "paused" : "running") : "idle"}`} />
        <span className="caption-text">
          {currentTitle}
          {active && ` · ${active.state === "paused" ? "일시정지" : "실행 중"}`}
        </span>
      </p>
    </section>
  );
}

export function Overview({
  workspace,
  tasks,
  summary,
  scope,
  categoryId,
  chooseCategory,
  active,
  remaining,
  busy,
  command,
  backup,
  exportCsv,
  manage,
  editor,
  taskCard,
  note,
  savedNote,
  changeNote,
  saveNote,
  revision,
  query,
  date
}: {
  workspace: Workspace;
  tasks: Task[];
  summary: Summary;
  scope: string;
  categoryId: string;
  chooseCategory: (id: string) => void;
  active?: Session;
  remaining: string;
  busy: boolean;
  command: (command: Command) => Promise<boolean>;
  backup: () => void;
  exportCsv: () => void;
  manage: () => void;
  editor: ReactNode;
  taskCard: (task: Task) => ReactNode;
  note: string;
  savedNote: string;
  changeNote: (note: string) => void;
  saveNote: () => void;
  revision: number;
  query: string;
  date?: string;
}) {
  const pending = tasks.filter(t => t.status !== "done");
  const completed = tasks.filter(t => t.status === "done");

  return (
    <div className="overview-container">
      {/* 상단 툴바 */}
      <FocusToolbar
        workspace={workspace}
        tasks={pending}
        active={active}
        remaining={remaining}
        busy={busy}
        command={command}
        backup={backup}
        exportCsv={exportCsv}
        manage={manage}
        date={date}
      />

      {/* 3열 대시보드 그리드 */}
      <div className="overview-grid">
        {/* 좌측 열: 할 일 목록 */}
        <section className="card overview-task-list" aria-label="할 일 목록">
          {/* 카테고리 탭 필터 */}
          <div className="category-filter-tabs category-tabs" role="group" aria-label="분류 빠른 선택">
            <button className={`cat-tab ${!categoryId ? "active" : ""}`} aria-pressed={!categoryId} onClick={() => chooseCategory("")}>
              전체
            </button>
            {workspace.categories
              .filter(c => !c.archived)
              .map(c => (
                <button
                  key={c.id}
                  className={`cat-tab ${categoryId === c.id ? "active" : ""}`}
                  aria-pressed={categoryId === c.id}
                  onClick={() => chooseCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
          </div>

          <div className="overview-task-scroll">
            {/* 미완료 / 진행중 */}
            <section className="task-section" aria-label="미완료·진행중 목록">
              <div className="task-section-header">
                <h3>미완료/진행중</h3>
                <span className="count-badge">{pending.length}개</span>
              </div>
              <div className="task-card-list">
                {pending.length ? pending.map(task => taskCard(task)) : <p className="empty">미완료 할 일이 없습니다.</p>}
              </div>
            </section>

            {/* 완료 */}
            <section className="task-section" aria-label="완료 목록">
              <div className="task-section-header">
                <h3>완료</h3>
                <span className="count-badge completed-badge">{completed.length}개</span>
              </div>
              <div className="task-card-list">
                {completed.length ? completed.map(task => taskCard(task)) : <p className="empty">완료한 할 일이 없습니다.</p>}
              </div>
            </section>
          </div>
        </section>

        {/* 중앙 열: 할 일 추가 + 오늘의 성과 + 시간대별 차트 */}
        <div className="overview-planning stack">
          {editor}
          <SummaryPanel summary={summary} scope={scope} compact />
          <ChartPanel bins={summary.bins} />
        </div>

        {/* 우측 열: AI 생산성 분석 + 성과 노트(세로로 길게) */}
        <div className="overview-insights stack">
          <AnalysisPanel key={`${date}-${categoryId}-${query}-${revision}`} date={date!} categoryId={categoryId} query={query} revision={revision} completedCount={completed.length} scope={scope} busy={busy}/>
          <NotePanel note={note} savedNote={savedNote} busy={busy} change={changeNote} save={saveNote} />
        </div>
      </div>
    </div>
  );
}
