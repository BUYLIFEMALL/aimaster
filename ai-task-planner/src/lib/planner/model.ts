import { z } from "zod";

const id = z.string().uuid();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, "유효한 날짜를 선택해주세요.");
const time = z.number().int().min(0).max(8_640_000_000_000_000);
const nullableTime = time.nullable();
export const modeSchema = z.enum(["focus", "short", "long"]);
export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "할 일 제목을 입력해주세요.").max(200),
  categoryId: id,
  priority: z.enum(["high", "normal", "low"]),
  estimatedMinutes: z.number().int().min(0).max(1440),
  plannedDate: dateSchema
}).strict();
const categorySchema = z.object({ id, name: z.string().trim().min(1).max(30), archived: z.boolean() }).strict();
const taskSchema = taskInputSchema.extend({
  id, status: z.enum(["todo", "doing", "done"]),
  completedAt: nullableTime, deletedAt: nullableTime, createdAt: time
}).strict();
const segmentSchema = z.object({ start: time, end: time }).strict().refine(s => s.end > s.start);
const sessionSchema = z.object({
  id, taskId: id.nullable(), mode: modeSchema, durationSeconds: z.number().int().min(60).max(10800),
  state: z.enum(["running", "paused", "completed", "ended"]),
  remainingMs: z.number().int().min(0).max(10_800_000),
  runningSince: nullableTime, deadline: nullableTime,
  segments: z.array(segmentSchema).max(1000), endedAt: nullableTime
}).strict().superRefine((s, ctx) => {
  if (s.mode === "focus" && !s.taskId) ctx.addIssue({ code: "custom", message: "집중 세션에는 할 일이 필요합니다." });
  if (s.remainingMs > s.durationSeconds * 1000) ctx.addIssue({ code: "custom", message: "남은 시간이 세션 길이를 넘습니다." });
  if (s.state === "running") {
    if (s.runningSince === null || s.deadline === null || s.deadline - s.runningSince !== s.remainingMs || s.endedAt !== null)
      ctx.addIssue({ code: "custom", message: "실행 시각이 일치하지 않습니다." });
  } else if (s.runningSince !== null || s.deadline !== null) ctx.addIssue({ code: "custom", message: "종료/정지 시각이 올바르지 않습니다." });
  const elapsed = s.segments.reduce((sum, seg) => sum + seg.end - seg.start, 0);
  if (elapsed + s.remainingMs !== s.durationSeconds * 1000) ctx.addIssue({ code: "custom", message: "세션 시간 합계가 일치하지 않습니다." });
  for (let i = 1; i < s.segments.length; i++) {
    if (s.segments[i].start < s.segments[i - 1].end) ctx.addIssue({ code: "custom", message: "세션 구간이 중복됩니다." });
  }
});
export const settingsSchema = z.object({
  timezone: z.literal("Asia/Seoul"), defaultCategoryId: id,
  durations: z.object({ focus: z.number().int().min(1).max(180), short: z.number().int().min(1).max(60), long: z.number().int().min(1).max(120) }).strict()
}).strict();
export const workspaceSchema = z.object({
  schemaVersion: z.literal(1), categories: z.array(categorySchema).min(1).max(100),
  tasks: z.array(taskSchema).max(5000), sessions: z.array(sessionSchema).max(20000),
  notes: z.record(dateSchema, z.string().max(10000)), settings: settingsSchema
}).strict().superRefine((w, ctx) => {
  const categories = new Map(w.categories.map(c => [c.id, c]));
  const tasks = new Map(w.tasks.map(t => [t.id, t]));
  const issue = (message: string) => ctx.addIssue({ code: "custom", message });
  if (categories.size !== w.categories.length || tasks.size !== w.tasks.length || new Set(w.sessions.map(s => s.id)).size !== w.sessions.length) issue("ID가 중복됩니다.");
  const names = w.categories.map(c => c.name.normalize("NFKC").toLocaleLowerCase());
  if (new Set(names).size !== names.length || names.includes("전체")) issue("분류 이름이 중복되거나 예약어입니다.");
  if (!categories.get(w.settings.defaultCategoryId) || categories.get(w.settings.defaultCategoryId)?.archived) issue("기본 분류가 유효하지 않습니다.");
  for (const t of w.tasks) {
    if (!categories.has(t.categoryId)) issue("할 일의 분류를 찾을 수 없습니다.");
    if ((t.status === "done") !== (t.completedAt !== null)) issue("완료 상태와 시각이 일치하지 않습니다.");
  }
  const active = w.sessions.filter(s => s.state === "running" || s.state === "paused");
  if (active.length > 1) issue("활성 타이머는 하나만 허용됩니다.");
  for (const s of w.sessions) {
    if (s.taskId && !tasks.has(s.taskId)) issue("세션의 할 일을 찾을 수 없습니다.");
    if (s.taskId && (s.state === "running" || s.state === "paused")) {
      const task = tasks.get(s.taskId)!;
      if (task.deletedAt !== null || task.status === "done") issue("삭제/완료 작업의 타이머를 실행할 수 없습니다.");
    }
  }
});
export type Workspace = z.infer<typeof workspaceSchema>;
export type Task = Workspace["tasks"][number];
export type Session = Workspace["sessions"][number];
export type Mode = z.infer<typeof modeSchema>;
export type TaskInput = z.infer<typeof taskInputSchema>;
export const PRIORITY_LABELS = { high: "높음", normal: "보통", low: "낮음" };
export const MODE_LABELS = { focus: "집중", short: "짧은 휴식", long: "긴 휴식" };
export function emptyWorkspace(newId: () => string = () => crypto.randomUUID()): Workspace {
  const categories = ["업무", "개인", "학습", "기타"].map(name => ({ id: newId(), name, archived: false }));
  return { schemaVersion: 1, categories, tasks: [], sessions: [], notes: {}, settings: { timezone: "Asia/Seoul", defaultCategoryId: categories[0].id, durations: { focus: 25, short: 5, long: 15 } } };
}
export function localDate(now: number): string {
  // 첫 출시의 확정 시간대. Date 객체의 브라우저 지역 설정에 의존하지 않습니다.
  return new Date(now + 9 * 3600_000).toISOString().slice(0, 10);
}
