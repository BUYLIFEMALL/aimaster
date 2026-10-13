"use client";
import { useState, type ReactNode } from "react";
import { MODE_LABELS, PRIORITY_LABELS, type Mode, type Session, type Task, type Workspace } from "@/lib/planner/model";
import type { Command } from "@/lib/planner/engine";
import type { metrics } from "@/lib/planner/metrics";

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
      <div className="progress-section">
        <div className="progress-label-row">
          <span className="progress-title">완료율</span>
          <span className="progress-ratio">{completedCount} / {totalCount}</span>
        </div>
        <div className="progress-track" role="progressbar" aria-valuenow={completionRate} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, completionRate))}%` }} />
        </div>
        <div className="progress-percent-row">
          <span className="progress-percent">{completionRate}%</span>
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
          <strong className="metric-number">{summary.accuracy === null ? "0%" : `${summary.accuracy}%`}</strong>
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
  const maximum = Math.max(1, ...bins);
  const timeLabels = ["0시", "2시", "4시", "6시", "8시", "10시", "12시", "14시", "16시", "18시", "20시", "22시"];

  return (
    <section className="card chart-panel">
      <div className="section-header">
        <h2>차트</h2>
        <span className="section-sub">시간대별 완료 수</span>
      </div>
      <div className="chart-wrapper">
        <div className="chart-grid-lines">
          <span>4</span>
          <span>3</span>
          <span>2</span>
          <span>1</span>
          <span>0</span>
        </div>
        <div className="chart" aria-label="시간대별 완료 수">
          {bins.map((count, index) => (
            <div key={index} className="chart-col">
              <span className={`col-count ${count > 0 ? "active" : ""}`}>{count > 0 ? count : ""}</span>
              <div className="col-bar-track">
                <i
                  className={`col-bar ${count > 0 ? "filled" : ""}`}
                  style={{ height: `${Math.max(4, (count / maximum) * 90)}%` }}
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
      </div>
      <div className="note-content">
        <textarea
          maxLength={10000}
          value={note}
          onChange={e => change(e.target.value)}
          placeholder="오늘 무엇이 잘 됐나요? 내일 개선할 점은?"
        />
        <div className="note-footer">
          <p className="note-status-text">
            {note === savedNote ? "자동 저장됩니다" : "변경 내용이 아직 저장되지 않았습니다"}
          </p>
          <button className="primary note-save-btn" disabled={busy} onClick={save}>
            노트 저장
          </button>
        </div>
      </div>
    </section>
  );
}

export function AnalysisPanel() {
  const [analyzing, setAnalyzing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const handleAnalyze = () => {
    setModalOpen(true);
  };

  return (
    <section className="card analysis-panel">
      <div className="section-header">
        <h2>AI 생산성 분석</h2>
      </div>
      <p className="analysis-desc">완료된 할 일을 기반으로 AI가 학습 패턴과 개선점을 찾아줘요.</p>
      <button className="ai-analyze-btn" onClick={handleAnalyze} disabled={analyzing}>
        <span className="sparkle">✨</span> 달성 결과 분석하기
      </button>

      {modalOpen && (
        <div className="analysis-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="analysis-modal" onClick={e => e.stopPropagation()}>
            <h3>✨ AI 생산성 분석 안내</h3>
            <p>
              회원 본인의 Gemini API 키를 기반으로 맞춤 생산성 패턴 분석을 진행합니다.
              <br />
              현재 분석 엔진 연동 준비 중이며, 상단 <strong>설정</strong> 메뉴에서 본인 API 키를 등록해두시면 곧바로 이용하실 수 있습니다.
            </p>
            <div className="modal-actions">
              <button className="primary" onClick={() => setModalOpen(false)}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}
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

  // CSV 내보내기 기능
  const exportCsv = () => {
    const targetDate = date || new Date().toISOString().slice(0, 10);
    const dayTasks = workspace.tasks.filter(t => t.deletedAt === null && t.plannedDate === targetDate);
    const headers = ["제목", "카테고리", "우선순위", "예상시간(분)", "계획날짜", "상태"];
    const rows = dayTasks.map(t => [
      `"${t.title.replace(/"/g, '""')}"`,
      `"${workspace.categories.find(c => c.id === t.categoryId)?.name ?? "기타"}"`,
      PRIORITY_LABELS[t.priority] || t.priority,
      t.estimatedMinutes,
      t.plannedDate,
      t.status === "done" ? "완료" : t.status === "doing" ? "진행중" : "미완료"
    ]);
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `할일목록-${targetDate}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

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
              <button className="timer-action-btn secondary" disabled={busy} onClick={() => void command({ type: "timer.end", sessionId: active.id })}>
                종료
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
            하루 리셋
          </button>
        </div>
      </div>

      <div className="toolbar-caption-row">
        <span className={`state-dot ${active ? (active.state === "paused" ? "paused" : "running") : "idle"}`} />
        <span className="caption-text">
          {currentTitle}
          {active && ` · ${active.state === "paused" ? "일시정지" : "실행 중"}`}
        </span>
      </div>
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
  manage,
  editor,
  taskCard,
  note,
  savedNote,
  changeNote,
  saveNote,
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
  manage: () => void;
  editor: ReactNode;
  taskCard: (task: Task) => ReactNode;
  note: string;
  savedNote: string;
  changeNote: (note: string) => void;
  saveNote: () => void;
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
        manage={manage}
        date={date}
      />

      {/* 3열 대시보드 그리드 */}
      <div className="overview-grid">
        {/* 좌측 열: 할 일 목록 */}
        <section className="card overview-task-list" aria-label="할 일 목록">
          {/* 카테고리 탭 필터 */}
          <div className="category-filter-tabs" role="group" aria-label="카테고리 필터">
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

        {/* 중앙 열: 할 일 추가 + 오늘의 성과 */}
        <div className="overview-planning stack">
          {editor}
          <SummaryPanel summary={summary} scope={scope} compact />
        </div>

        {/* 우측 열: 차트 + AI 생산성 분석 + 성과 노트 */}
        <div className="overview-insights stack">
          <ChartPanel bins={summary.bins} />
          <AnalysisPanel />
          <NotePanel note={note} savedNote={savedNote} busy={busy} change={changeNote} save={saveNote} />
        </div>
      </div>
    </div>
  );
}

