// U8 업무 워크스페이스 연계(플랜 docs/PLAN_20261025_U8_WORK_INBOX.md): 회원 본인 기록에서
// 워크스페이스 「받은 업무」로 보낼 내용(제목·본문 마크다운·표 행 데이터)을 만든다. 서버에서만 부르고,
// 브라우저가 보낸 본문을 그대로 넣지 않는다.
import { z } from "zod";
import { dateSchema, PRIORITY_LABELS, type Workspace } from "./model";
import { metrics, focusTotals } from "./metrics";
import { PlannerError } from "./engine";

export const inboxInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("task"), taskId: z.string().uuid() }).strict(),
  z.object({ type: z.literal("day"), date: dateSchema, categoryId: z.union([z.literal(""), z.string().uuid()]), query: z.string().max(200) }).strict()
]);
export type InboxInput = z.infer<typeof inboxInputSchema>;
export interface InboxContent {
  kind: "task" | "document";
  title: string;
  bodyMd: string;
  data: Record<string, string | number>;
}

const STATUS_KO = { todo: "할 일", doing: "진행 중", done: "완료" } as const;
const FOOTER = "\n\n---\nAI 할 일 플래너에서 보냄";
function line(text: string) { return text.replace(/\s+/g, " ").trim(); }
function minutes(seconds: number) { return Math.round(seconds / 60); }
function duration(seconds: number) {
  if (seconds <= 0) return "미측정";
  const m = minutes(seconds);
  return m < 1 ? "1분 미만" : m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ""}`;
}
function kstTime(ms: number) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(ms));
}
function categoryName(w: Workspace, id: string) { return w.categories.find(c => c.id === id)?.name ?? "기타"; }

/** 할 일 하나 → 받은 업무(할 일) */
export function taskInboxContent(w: Workspace, taskId: string, now: number): InboxContent {
  const task = w.tasks.find(t => t.id === taskId);
  if (!task || task.deletedAt !== null) throw new PlannerError("보낼 할 일을 찾지 못했습니다. 목록을 새로 불러온 뒤 다시 시도해주세요.", 404);
  const focus = focusTotals(w, now).get(task.id) ?? 0, category = categoryName(w, task.categoryId);
  const status = task.status === "done" && task.completedAt !== null ? `완료(${kstTime(task.completedAt)})` : STATUS_KO[task.status];
  const bodyMd = [
    `- 분류: ${category}`,
    `- 우선순위: ${PRIORITY_LABELS[task.priority]}`,
    `- 예정일: ${task.plannedDate}`,
    `- 예상 시간: ${task.estimatedMinutes ? `${task.estimatedMinutes}분` : "미설정"}`,
    `- 상태: ${status}`,
    `- 집중한 시간: ${duration(focus)}`
  ].join("\n") + FOOTER;
  return {
    kind: "task", title: line(task.title), bodyMd,
    data: { 예정일: task.plannedDate, 우선순위: PRIORITY_LABELS[task.priority], 분류: category, 상태: STATUS_KO[task.status], "예상 시간(분)": task.estimatedMinutes, "집중 시간(분)": minutes(focus) }
  };
}

/** 선택한 날짜·분류·검색 범위의 하루 성과 → 받은 업무(문서). 성과 노트는 저장된 내용만 넣는다. */
export function dayInboxContent(w: Workspace, input: { date: string; categoryId: string; query: string }, now: number): InboxContent {
  const totals = focusTotals(w, now), s = metrics(w, input.date, input.categoryId, input.query, now, totals);
  const note = (w.notes[input.date] ?? "").trim();
  if (!s.tasks.length && !note) throw new PlannerError("이 날짜에 보낼 할 일이나 성과 노트가 없습니다.");
  const scope = `${input.date}(한국 시간) · ${input.categoryId ? categoryName(w, input.categoryId) : "전체 분류"}${input.query ? ` · 제목 「${line(input.query)}」` : ""}`;
  const item = (t: Workspace["tasks"][number]) => t.status === "done"
    ? `- [x] ${line(t.title)} (${categoryName(w, t.categoryId)} · 집중 ${duration(totals.get(t.id) ?? 0)})`
    : `- [ ] ${line(t.title)} (${categoryName(w, t.categoryId)} · 우선순위 ${PRIORITY_LABELS[t.priority]})`;
  const done = s.tasks.filter(t => t.status === "done"), left = s.tasks.filter(t => t.status !== "done");
  const bodyMd = [
    "## 오늘의 성과",
    `- 완료율: ${s.completion}% (${done.length} / ${s.tasks.length}개)`,
    `- 총 집중 시간: ${duration(s.focusSeconds)}`,
    `- 예측 정확도: ${s.accuracy === null ? "미측정" : `${s.accuracy}%`}`,
    `- 성과 점수: ${s.score}점`,
    `- 집계 범위: ${scope}`,
    "", "## 완료한 할 일", done.length ? done.map(item).join("\n") : "- 없음",
    "", "## 남은 할 일", left.length ? left.map(item).join("\n") : "- 없음",
    "", "## 성과 노트", note || "(저장한 노트 없음)"
  ].join("\n") + FOOTER;
  return {
    kind: "document",
    title: `${input.date} 할 일·성과 보고${input.categoryId ? ` · ${categoryName(w, input.categoryId)}` : ""}`,
    bodyMd,
    data: { 날짜: input.date, "완료율(%)": s.completion, "완료 수": done.length, "계획 수": s.tasks.length, "집중 시간(분)": minutes(s.focusSeconds), "성과 점수": s.score }
  };
}
