import { type Workspace, type Session, localDate } from "./model";
export function segmentsAt(s: Session, now: number) {
  const segments = [...s.segments];
  if (s.state === "running" && s.runningSince !== null && s.deadline !== null) {
    const end = Math.min(now, s.deadline);
    if (end > s.runningSince) segments.push({ start: s.runningSince, end });
  }
  return segments;
}
export function taskFocusSeconds(w: Workspace, taskId: string, now: number): number {
  return Math.floor(w.sessions.filter(s => s.mode === "focus" && s.taskId === taskId).reduce((sum, s) => sum + segmentsAt(s, now).reduce((ms, seg) => ms + seg.end - seg.start, 0), 0) / 1000);
}
export function focusTotals(w: Workspace, now: number): Map<string, number> {
  const millis = new Map<string, number>();
  for (const s of w.sessions) if (s.mode === "focus" && s.taskId) {
    const sum = segmentsAt(s, now).reduce((ms, seg) => ms + seg.end - seg.start, 0);
    millis.set(s.taskId, (millis.get(s.taskId) ?? 0) + sum);
  }
  return new Map([...millis].map(([id, ms]) => [id, Math.floor(ms / 1000)]));
}
export function metrics(w: Workspace, date: string, categoryId: string, query: string, now: number, totals = focusTotals(w, now)) {
  const matches = (task: Workspace["tasks"][number]) => task.deletedAt === null && (!categoryId || task.categoryId === categoryId) && task.title.toLocaleLowerCase().includes(query.toLocaleLowerCase());
  const tasks = w.tasks.filter(t => t.plannedDate === date && matches(t));
  const completed = tasks.filter(t => t.status === "done");
  const completion = tasks.length ? Math.round(completed.length / tasks.length * 100) : 0;
  const samples = completed.filter(t => t.estimatedMinutes > 0 && (totals.get(t.id) ?? 0) > 0);
  const accuracy = samples.length ? Math.round(samples.reduce((sum, t) => {
    const actual = (totals.get(t.id) ?? 0) / 60;
    return sum + Math.min(t.estimatedMinutes, actual) / Math.max(t.estimatedMinutes, actual);
  }, 0) / samples.length * 100) : null;
  const bins = Array.from({ length: 12 }, () => 0);
  for (const t of completed) if (t.completedAt !== null && localDate(t.completedAt) === date) bins[Math.floor(new Date(t.completedAt + 9 * 3600_000).getUTCHours() / 2)]++;
  const start = new Date(`${date}T00:00:00+09:00`).getTime(), end = start + 24 * 3600_000;
  // 실행일과 계획일을 구분합니다. 전날 계획한 일도 선택 날짜의 집중 구간은 포함합니다.
  const includedIds = new Set(w.tasks.filter(matches).map(t => t.id));
  let focusedMs = 0;
  for (const s of w.sessions) if (s.mode === "focus" && s.taskId && includedIds.has(s.taskId)) {
    for (const seg of segmentsAt(s, now)) focusedMs += Math.max(0, Math.min(end, seg.end) - Math.max(start, seg.start));
  }
  return { tasks, completed, completion, accuracy, accuracySamples: samples.length, focusSeconds: Math.floor(focusedMs / 1000), score: accuracy === null ? completion : Math.round(completion * .7 + accuracy * .3), bins };
}
