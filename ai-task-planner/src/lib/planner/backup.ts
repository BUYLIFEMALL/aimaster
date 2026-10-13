import { z } from "zod";
import { workspaceSchema, type Workspace } from "./model";
import { APP_VERSION } from "../version";

export const MAX_BACKUP_BYTES = 4 * 1024 * 1024;
export const backupSchema = z.object({ program: z.literal("ai-task-planner"), appVersion: z.string().regex(/^v1\.\d{2}$/), exportedAt: z.iso.datetime(), workspace: workspaceSchema }).strict();
export type Backup = z.infer<typeof backupSchema>;
export function validateBackup(raw: unknown, now = Date.now()): Backup {
  const parsed = backupSchema.safeParse(raw);
  if (!parsed.success) throw new Error("백업의 버전·날짜·분류·집중 기록 형식을 확인해주세요.");
  const backup = parsed.data;
  if (Number(backup.appVersion.slice(1)) > Number(APP_VERSION.slice(1))) throw new Error("더 최신 버전의 백업입니다. 프로그램을 갱신한 뒤 가져와주세요.");
  const exported = Date.parse(backup.exportedAt);
  if (exported > now + 60_000) throw new Error("백업의 내보낸 시각이 미래입니다.");
  const w = backup.workspace;
  const tasks = new Map(w.tasks.map(t => [t.id, t]));
  for (const t of w.tasks) {
    if (t.createdAt > exported || (t.completedAt !== null && (t.completedAt < t.createdAt || t.completedAt > exported)) || (t.deletedAt !== null && (t.deletedAt < t.createdAt || t.deletedAt > exported))) throw new Error("할 일의 기록 시각이 올바르지 않습니다.");
  }
  for (const s of w.sessions) {
    if (s.state === "running") throw new Error("실행 중인 세션이 있는 백업은 가져올 수 없습니다. JSON 백업을 다시 내려받아주세요.");
    if ((s.state === "paused") !== (s.endedAt === null)) throw new Error("세션 종료 시각이 올바르지 않습니다.");
    if (s.state === "completed" && s.remainingMs !== 0) throw new Error("완료 세션의 남은 시간이 올바르지 않습니다.");
    const task = s.taskId ? tasks.get(s.taskId) : null;
    if (s.segments.some(seg => seg.end > exported || (task && seg.start < task.createdAt))) throw new Error("집중 구간의 시각이 올바르지 않습니다.");
    if (s.endedAt !== null && (s.endedAt > exported || s.endedAt < (s.segments.at(-1)?.end ?? 0))) throw new Error("세션 종료 시각이 집중 구간과 일치하지 않습니다.");
  }
  return backup;
}
export function parseBackup(text: string, now = Date.now()) {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error("백업 파일은 4MiB 이하만 가져올 수 있습니다.");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("유효한 JSON 백업 파일을 선택해주세요."); }
  return validateBackup(value, now);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function mergeBackup(source: Workspace, raw: Backup, now = Date.now(), restoreSettings = false) {
  const backup = validateBackup(raw, now), incoming = backup.workspace, w = structuredClone(source);
  if (w.sessions.some(s => s.state === "running" || s.state === "paused")) throw new Error("현재 타이머를 정산 종료한 뒤 백업을 가져와주세요.");
  const stats = { tasks: 0, sessions: 0, notes: 0, categories: 0, conflicts: 0, duplicates: 0 };
  const categoryMap = new Map<string, string>(), taskMap = new Set<string>();
  const normalize = (name: string) => name.normalize("NFKC").toLocaleLowerCase();
  const categoriesById = new Map(w.categories.map(c => [c.id, c]));
  const categoriesByName = new Map(w.categories.map(c => [normalize(c.name), c]));
  const tasksById = new Map(w.tasks.map(t => [t.id, t]));
  const sessionsById = new Map(w.sessions.map(s => [s.id, s]));
  for (const category of incoming.categories) {
    const existing = categoriesById.get(category.id);
    if (existing) {
      if (normalize(existing.name) !== normalize(category.name)) throw new Error("동일한 분류 ID의 이름이 다릅니다. 기존 분류를 보존하기 위해 가져오기를 중단했습니다.");
      categoryMap.set(category.id, existing.id);
    } else {
      const byName = categoriesByName.get(normalize(category.name));
      if (byName) categoryMap.set(category.id, byName.id);
      else { w.categories.push(category); categoriesById.set(category.id, category); categoriesByName.set(normalize(category.name), category); categoryMap.set(category.id, category.id); stats.categories++; }
    }
  }
  if (restoreSettings) {
    const defaultCategoryId = categoryMap.get(incoming.settings.defaultCategoryId)!;
    if (categoriesById.get(defaultCategoryId)?.archived) throw new Error("백업 기본 분류가 현재 보관된 분류와 같습니다. 설정을 유지하고 가져와주세요.");
    w.settings = { ...incoming.settings, defaultCategoryId };
  }
  for (const original of incoming.tasks) {
    const task = { ...original, categoryId: categoryMap.get(original.categoryId)! };
    // 백업 안의 활성 작업은 자동 실행하지 않습니다.
    if (task.status === "doing") task.status = "todo";
    const existing = tasksById.get(task.id);
    if (!existing) { w.tasks.push(task); taskMap.add(task.id); stats.tasks++; }
    else if (same(existing, task)) { taskMap.add(task.id); stats.duplicates++; }
    else stats.conflicts++;
  }
  for (const original of incoming.sessions) {
    if (original.taskId && !taskMap.has(original.taskId)) { stats.conflicts++; continue; }
    const session = structuredClone(original);
    if (session.state === "paused") { session.state = "ended"; session.endedAt = Date.parse(backup.exportedAt); }
    const existing = sessionsById.get(session.id);
    if (existing) { if (same(existing, session)) stats.duplicates++; else stats.conflicts++; }
    else { w.sessions.push(session); stats.sessions++; }
  }
  for (const [day, note] of Object.entries(incoming.notes)) {
    if (Object.hasOwn(w.notes, day)) { if (w.notes[day] !== note) stats.conflicts++; else stats.duplicates++; }
    else { w.notes[day] = note; stats.notes++; }
  }
  // 같은 시간대의 중복 세션을 합산하지 않습니다. 파일 간 충돌도 원자적으로 거부합니다.
  const segments = w.sessions.flatMap(s => s.segments).sort((a, b) => a.start - b.start);
  for (let i = 1; i < segments.length; i++) if (segments[i].start < segments[i - 1].end) throw new Error("집중·휴식 구간이 기존 기록과 겹칩니다. 기존 기록을 보존하기 위해 가져오기를 중단했습니다.");
  const parsedWorkspace = workspaceSchema.safeParse(w);
  if (!parsedWorkspace.success) throw new Error("가져온 뒤 기록 개수나 분류·세션 관계가 올바르지 않습니다. 기존 기록은 보존했습니다.");
  const workspace = parsedWorkspace.data;
  if (new TextEncoder().encode(JSON.stringify(workspace)).byteLength > 8 * 1024 * 1024) throw new Error("가져온 뒤 기록 크기가 저장 한도를 넘습니다.");
  return { workspace, stats };
}
