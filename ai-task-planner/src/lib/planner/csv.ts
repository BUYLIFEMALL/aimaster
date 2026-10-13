import { PRIORITY_LABELS, type Workspace, type Task } from "./model";
import { focusTotals } from "./metrics";
export function csvCell(value: string | number) {
  let text = String(value);
  if (typeof value === "string" && /^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
export function tasksCsv(w: Workspace, tasks: Task[], scope: string, now: number) {
  const totals = focusTotals(w, now);
  const rows: (string | number)[][] = [["집계 범위", "제목", "분류", "우선순위", "예상시간(분)", "계획 날짜", "상태", "실제집중(초·전체기간)", "측정 여부", "완료시각(UTC)"]];
  for (const t of tasks) {
    const actual = totals.get(t.id) ?? 0;
    rows.push([scope, t.title, w.categories.find(c => c.id === t.categoryId)?.name ?? "기타", PRIORITY_LABELS[t.priority], t.estimatedMinutes, t.plannedDate, t.status === "done" ? "완료" : t.status === "doing" ? "진행중" : "미완료", actual, actual > 0 ? "측정됨" : "미측정", t.completedAt === null ? "" : new Date(t.completedAt).toISOString()]);
  }
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}
