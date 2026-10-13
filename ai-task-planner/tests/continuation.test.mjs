import test from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, localDate } from "../src/lib/planner/model.ts";
import { applyCommand } from "../src/lib/planner/engine.ts";
import { validateBackup, parseBackup, mergeBackup, MAX_BACKUP_BYTES } from "../src/lib/planner/backup.ts";
import { tasksCsv } from "../src/lib/planner/csv.ts";
import { analysisData, analysisPrompt, analysisSchema } from "../src/lib/planner/ai.ts";
import { APP_VERSION } from "../src/lib/version.ts";
const now = Date.now(), day = localDate(now);
const add = (w, title = "기록") => applyCommand(w, { type: "task.add", input: { title, categoryId: w.settings.defaultCategoryId, priority: "high", estimatedMinutes: 10, plannedDate: day } }, now - 120_000);
const backup = w => ({ program: "ai-task-planner", appVersion: APP_VERSION, exportedAt: new Date(now).toISOString(), workspace: w });

test("backup adds missing records atomically, preserves current notes/settings and is repeatable", () => {
  const source = emptyWorkspace(); source.notes[day] = "현재 노트";
  let incoming = add(emptyWorkspace()); incoming.notes[day] = "이전 노트";
  incoming = applyCommand(incoming, { type: "timer.start", mode: "focus", taskId: incoming.tasks[0].id }, now - 60_000);
  incoming = applyCommand(incoming, { type: "timer.pause", sessionId: incoming.sessions[0].id }, now - 30_000);
  const { workspace, stats } = mergeBackup(source, backup(incoming), now);
  assert.equal(source.tasks.length, 0); assert.equal(workspace.tasks.length, 1);
  assert.equal(workspace.notes[day], "현재 노트"); assert.deepEqual(workspace.settings, source.settings);
  assert.equal(workspace.tasks[0].status, "todo"); assert.equal(workspace.sessions[0].state, "ended");
  assert.equal(stats.conflicts, 1); assert.equal(workspace.sessions[0].segments[0].end - workspace.sessions[0].segments[0].start, 30_000);
  const repeated = mergeBackup(workspace, backup(incoming), now); assert.deepEqual(repeated.workspace, workspace);
  incoming.settings.durations.focus = 40; incoming.settings.aiModel = "gemini-3.8-flash";
  const restoredSettings = mergeBackup(source, backup(incoming), now, true).workspace;
  assert.equal(restoredSettings.settings.durations.focus, 40); assert.equal(restoredSettings.settings.aiModel, "gemini-3.8-flash"); assert.equal(restoredSettings.settings.defaultCategoryId, source.settings.defaultCategoryId);
});
test("backup conflicts never overwrite current tasks or attach their imported timing", () => {
  const source = add(emptyWorkspace()); const incoming = structuredClone(source);
  incoming.tasks[0].title = "서로 다른 수정";
  let withSession = applyCommand(incoming, { type: "timer.start", mode: "focus", taskId: incoming.tasks[0].id }, now - 5000);
  withSession = applyCommand(withSession, { type: "timer.end", sessionId: withSession.sessions[0].id }, now - 1000);
  const merged = mergeBackup(source, backup(withSession), now);
  assert.deepEqual(merged.workspace, source); assert.equal(merged.stats.conflicts, 2);
});
test("backup rejects invalid dates, future versions, running sessions, bad chronology, size and foreign references", () => {
  const w = add(emptyWorkspace());
  const cases = [];
  const invalidDay = backup(structuredClone(w)); invalidDay.workspace.tasks[0].plannedDate = "2026-02-30"; cases.push(invalidDay);
  const foreign = backup(structuredClone(w)); foreign.workspace.tasks[0].categoryId = crypto.randomUUID(); cases.push(foreign);
  const futureVersion = backup(w); futureVersion.appVersion = "v1.99"; cases.push(futureVersion);
  const futureTime = backup(w); futureTime.exportedAt = new Date(now + 120_000).toISOString(); cases.push(futureTime);
  const badTime = backup(structuredClone(w)); badTime.workspace.tasks[0].createdAt = now + 1; cases.push(badTime);
  const running = applyCommand(w, { type: "timer.start", mode: "focus", taskId: w.tasks[0].id }, now - 5000); cases.push(backup(running));
  for (const value of cases) assert.throws(() => validateBackup(value, now));
  assert.throws(() => parseBackup(" ".repeat(MAX_BACKUP_BYTES + 1), now));
  assert.throws(() => mergeBackup(running, backup(w), now), /타이머/);
});
test("backup rejects overlapping imported timing without mutating stored records", () => {
  let w = add(emptyWorkspace()); w = applyCommand(w, { type: "timer.start", mode: "focus", taskId: w.tasks[0].id }, now - 5000); w = applyCommand(w, { type: "timer.end", sessionId: w.sessions[0].id }, now - 1000);
  w = applyCommand(w, { type: "task.complete", id: w.tasks[0].id }, now);
  const incoming = structuredClone(w); incoming.sessions[0].id = crypto.randomUUID();
  assert.throws(() => mergeBackup(w, backup(incoming), now), /겹칩니다/); assert.equal(w.sessions.length, 1);
});
function parseCsv(text) {
  const rows = []; let row = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) { const c = text[i]; if (c === '"') { if (quoted && text[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted; } else if (!quoted && c === ',') { row.push(field); field = ""; } else if (!quoted && c === '\r' && text[i + 1] === '\n') { row.push(field); rows.push(row); row = []; field = ""; i++; } else field += c; }
  row.push(field); rows.push(row); return rows;
}
test("CSV parses Unicode/quotes/commas/newlines, prevents formulas in all string fields and scopes rows", () => {
  let w = add(emptyWorkspace(), '=SUM(1,2)\n"한글"'); w.categories[0].name = '@분류,"인용"';
  w = add(w, "내보내지 않을 작업");
  const csv = tasksCsv(w, [w.tasks[0]], "날짜 · 선택 분류", now); assert.ok(csv.startsWith("\uFEFF"));
  const rows = parseCsv(csv.slice(1)); assert.equal(rows.length, 2); assert.equal(rows[1].length, 10);
  assert.equal(rows[1][1], '\'=SUM(1,2)\n"한글"'); assert.equal(rows[1][2], '\'@분류,"인용"'); assert.equal(rows[1][8], "미측정");
  assert.equal(csv.includes("내보내지 않을 작업"), false);
});
test("AI input follows displayed scope, preserves unmeasured values, excludes notes and validates incomplete JSON", () => {
  let w = add(emptyWorkspace(), "범위 안"); w = add(w, "범위 밖"); w = applyCommand(w, { type: "task.complete", id: w.tasks[0].id }, now - 1000); w.notes[day] = "외부로 보내지 않을 노트";
  const data = analysisData(w, { date: day, categoryId: "", query: "안", revision: 0 }, now);
  assert.equal(data.tasks.length, 1); assert.equal(data.completedCount, 1); assert.equal(data.predictionAccuracy, null); assert.equal(data.tasks[0].measured, false);
  assert.equal(JSON.stringify(data).includes(w.notes[day]), false); assert.match(analysisPrompt(data), new RegExp(String(new Date().getFullYear())));
  assert.throws(() => analysisSchema.parse({ summary: "정상 JSON이지만 제안이 누락됨", strengths: ["실행"] }));
});
