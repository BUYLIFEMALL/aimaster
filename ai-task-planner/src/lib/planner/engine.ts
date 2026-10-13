import { z } from "zod";
import { workspaceSchema, taskInputSchema, dateSchema, settingsSchema, modeSchema, type Workspace, type Session } from "./model";
import { backupSchema, mergeBackup } from "./backup";

const id = z.string().uuid();
export const commandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("backup.merge"), backup: backupSchema, restoreSettings: z.boolean().optional() }).strict(),
  z.object({ type: z.literal("task.add"), input: taskInputSchema }).strict(),
  z.object({ type: z.literal("task.edit"), id, input: taskInputSchema }).strict(),
  z.object({ type: z.enum(["task.complete", "task.undo", "task.trash", "task.restore"]), id }).strict(),
  z.object({ type: z.literal("category.add"), name: z.string().trim().min(1).max(30) }).strict(),
  z.object({ type: z.literal("category.archive"), id }).strict(),
  z.object({ type: z.literal("settings.save"), settings: settingsSchema }).strict(),
  z.object({ type: z.literal("note.save"), date: dateSchema, note: z.string().max(10000) }).strict(),
  z.object({ type: z.literal("timer.start"), mode: modeSchema, taskId: id.nullable() }).strict(),
  z.object({ type: z.enum(["timer.pause", "timer.resume", "timer.end", "timer.finish"]), sessionId: id }).strict()
]);
export type Command = z.infer<typeof commandSchema>;
export class PlannerError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export function activeSession(w: Workspace): Session | undefined {
  return w.sessions.find(s => s.state === "running" || s.state === "paused");
}
export function remainingMs(s: Session, now: number): number {
  return s.state === "running" ? Math.max(0, (s.deadline ?? now) - now) : s.remainingMs;
}
function settle(s: Session, now: number) {
  if (s.state !== "running") return;
  const end = Math.min(s.deadline!, Math.max(s.runningSince!, now));
  if (end > s.runningSince!) s.segments.push({ start: s.runningSince!, end });
  s.remainingMs = s.deadline! - end;
  s.runningSince = null; s.deadline = null;
  s.state = s.remainingMs === 0 ? "completed" : "paused";
  if (s.state === "completed") s.endedAt = end;
}
function endSession(s: Session, now: number) {
  settle(s, now);
  if (s.state !== "completed") { s.state = "ended"; s.endedAt = now; }
}
export function applyCommand(source: Workspace, raw: unknown, now: number, newId: () => string = () => crypto.randomUUID()): Workspace {
  const command = commandSchema.parse(raw);
  if (command.type === "backup.merge") {
    try { return mergeBackup(source, command.backup, now, command.restoreSettings ?? false).workspace; }
    catch (error) { throw new PlannerError(error instanceof Error ? error.message : "백업을 가져오지 못했습니다."); }
  }
  const w = structuredClone(source);
  // Expired runs are reconciled with the recorded deadline, exactly once.
  const previous = activeSession(w);
  if (previous?.state === "running" && previous.deadline! <= now) settle(previous, now);
  const current = activeSession(w);
  if (command.type === "task.add" || command.type === "task.edit") {
    const category = w.categories.find(c => c.id === command.input.categoryId && !c.archived);
    if (!category) throw new PlannerError("사용할 수 있는 분류를 선택해주세요.");
    if (command.type === "task.add") w.tasks.push({ ...command.input, id: newId(), createdAt: now, status: "todo", completedAt: null, deletedAt: null });
    else {
      const task = w.tasks.find(t => t.id === command.id && t.deletedAt === null);
      if (!task) throw new PlannerError("할 일을 찾을 수 없습니다.", 404);
      Object.assign(task, command.input); // 세션·실제 시간을 수정 값으로 덮어쓰지 않습니다.
    }
  } else if (command.type.startsWith("task.")) {
    const taskCommand = command as Extract<Command, { id: string }>;
    const task = w.tasks.find(t => t.id === taskCommand.id);
    if (!task) throw new PlannerError("할 일을 찾을 수 없습니다.", 404);
    if (command.type !== "task.restore" && task.deletedAt !== null) throw new PlannerError("휴지통의 할 일입니다.", 409);
    if ((command.type === "task.complete" || command.type === "task.trash") && current?.taskId === task.id) endSession(current, now);
    if (command.type === "task.complete") { task.status = "done"; task.completedAt = now; }
    if (command.type === "task.undo") { task.status = "todo"; task.completedAt = null; }
    if (command.type === "task.trash") task.deletedAt = now;
    if (command.type === "task.restore") task.deletedAt = null;
  } else if (command.type === "category.add") {
    const normalized = command.name.normalize("NFKC").toLocaleLowerCase();
    if (normalized === "전체" || w.categories.some(c => c.name.normalize("NFKC").toLocaleLowerCase() === normalized)) throw new PlannerError("전체는 예약어이며 분류 이름은 중복될 수 없습니다.");
    w.categories.push({ id: newId(), name: command.name, archived: false });
  } else if (command.type === "category.archive") {
    const category = w.categories.find(c => c.id === command.id && !c.archived);
    if (!category) throw new PlannerError("분류를 찾을 수 없습니다.", 404);
    if (w.tasks.some(t => t.categoryId === category.id)) throw new PlannerError("기록에서 사용하는 분류는 보관할 수 없습니다.");
    const alternate = w.categories.find(c => c.id !== category.id && !c.archived);
    if (!alternate) throw new PlannerError("분류는 최소 한 개가 필요합니다.");
    category.archived = true;
    if (w.settings.defaultCategoryId === category.id) w.settings.defaultCategoryId = alternate.id;
  } else if (command.type === "settings.save") w.settings = command.settings;
  else if (command.type === "note.save") w.notes[command.date] = command.note;
  else if (command.type === "timer.start") {
    if (current) throw new PlannerError("현재 타이머를 먼저 종료해주세요.", 409);
    const task = command.taskId ? w.tasks.find(t => t.id === command.taskId && t.deletedAt === null && t.status !== "done") : null;
    if (command.mode === "focus" && !task) throw new PlannerError("미완료 할 일을 선택해주세요.");
    const durationSeconds = w.settings.durations[command.mode] * 60;
    if (command.mode === "focus") task!.status = "doing";
    w.sessions.push({ id: newId(), taskId: command.mode === "focus" ? task!.id : null, mode: command.mode, durationSeconds, state: "running", remainingMs: durationSeconds * 1000, runningSince: now, deadline: now + durationSeconds * 1000, segments: [], endedAt: null });
  } else if (command.type.startsWith("timer.")) {
    const tc = command as Extract<Command, { sessionId: string }>;
    const session = w.sessions.find(s => s.id === tc.sessionId);
    if (!session) throw new PlannerError("타이머를 찾을 수 없습니다.", 404);
    if (command.type === "timer.finish") {
      if (session.state === "running" && session.deadline! > now) throw new PlannerError("아직 종료 시각이 아닙니다.", 409);
      if (session.state === "running") settle(session, now);
    } else if (command.type === "timer.end") endSession(session, now);
    else if (command.type === "timer.pause") {
      if (session.state !== "running" && session.state !== "completed") throw new PlannerError("실행 중인 타이머가 아닙니다.", 409);
      settle(session, now);
    } else if (command.type === "timer.resume") {
      if (session.state !== "paused" || session.remainingMs <= 0) throw new PlannerError("재개 가능한 타이머가 아닙니다.", 409);
      const lastEnd = session.segments.at(-1)?.end ?? 0;
      if (now < lastEnd) throw new PlannerError("서버 시각을 다시 확인해주세요.", 409);
      session.state = "running"; session.runningSince = now; session.deadline = now + session.remainingMs;
    }
  }
  return workspaceSchema.parse(w);
}
