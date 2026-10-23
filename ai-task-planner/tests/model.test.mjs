import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { emptyWorkspace, workspaceSchema, dateSchema, localDate } from "../src/lib/planner/model.ts";
import { applyCommand, activeSession, remainingMs } from "../src/lib/planner/engine.ts";
import { metrics, taskFocusSeconds } from "../src/lib/planner/metrics.ts";
import { evaluateProgramAccess } from "../src/lib/programAccess.ts";

const epoch = Date.parse("2026-10-13T10:00:00+09:00");
function sample() {
  let w = emptyWorkspace();
  const input = { title: "보고서 작성", categoryId: w.categories[0].id, priority: "high", estimatedMinutes: 30, plannedDate: "2026-10-13" };
  w = applyCommand(w, { type: "task.add", input }, epoch);
  return { w, input, id: w.tasks[0].id };
}
test("new members have no fabricated task history", () => { const w = emptyWorkspace(); assert.equal(w.tasks.length, 0); assert.equal(w.sessions.length, 0); assert.equal(w.categories.length, 4); });
test("invalid calendar dates, whitespace titles, negative/fractional minutes are rejected", () => {
  assert.equal(dateSchema.safeParse("2026-02-30").success, false);
  const { w, input } = sample();
  for (const invalid of [{ title: "   " }, { estimatedMinutes: -1 }, { estimatedMinutes: 1.5 }, { categoryId: randomUUID() }]) assert.throws(() => applyCommand(w, { type: "task.add", input: { ...input, ...invalid } }, epoch));
});
test("category reservation, duplicate names and default replacement", () => {
  let w = emptyWorkspace(); assert.throws(() => applyCommand(w, { type: "category.add", name: " 전체 " }, epoch));
  assert.throws(() => applyCommand(w, { type: "category.add", name: "업무" }, epoch));
  const original = w.settings.defaultCategoryId;
  w = applyCommand(w, { type: "category.archive", id: original }, epoch);
  assert.notEqual(w.settings.defaultCategoryId, original);
  const sampleWork = sample(); assert.throws(() => applyCommand(sampleWork.w, { type: "category.archive", id: sampleWork.input.categoryId }, epoch));
});
test("pause and resume preserve seconds and do not count paused intervals", () => {
  let { w, id } = sample();
  w = applyCommand(w, { type: "timer.start", mode: "focus", taskId: id }, epoch);
  const sessionId = activeSession(w).id;
  assert.equal(w.tasks[0].status, "doing");
  w = applyCommand(w, { type: "timer.pause", sessionId }, epoch + 13_000);
  assert.equal(activeSession(w).remainingMs, 1487_000);
  assert.equal(taskFocusSeconds(w, id, epoch + 300_000), 13);
  w = applyCommand(w, { type: "timer.resume", sessionId }, epoch + 300_000);
  w = applyCommand(w, { type: "timer.pause", sessionId }, epoch + 317_000);
  assert.equal(taskFocusSeconds(w, id, epoch + 400_000), 30);
  assert.equal(activeSession(w).remainingMs, 1470_000);
});
test("metadata edits cannot overwrite active timing or inject actualTime", () => {
  let { w, input, id } = sample(); w = applyCommand(w, { type: "timer.start", mode: "focus", taskId: id }, epoch);
  const next = applyCommand(w, { type: "task.edit", id, input: { ...input, title: "수정한 보고서" } }, epoch + 18_000);
  assert.equal(taskFocusSeconds(next, id, epoch + 20_000), 20);
  assert.deepEqual(next.sessions, w.sessions);
  assert.throws(() => applyCommand(w, { type: "task.edit", id, input: { ...input, actualTime: 0 } }, epoch));
});
test("complete and trash settle and stop timing; restore preserves historical segments", () => {
  for (const type of ["task.complete", "task.trash"]) {
    let { w, id } = sample(); w = applyCommand(w, { type: "timer.start", mode: "focus", taskId: id }, epoch);
    w = applyCommand(w, { type, id }, epoch + 21_000);
    assert.equal(activeSession(w), undefined); assert.equal(taskFocusSeconds(w, id, epoch + 900_000), 21);
    if (type === "task.trash") { w = applyCommand(w, { type: "task.restore", id }, epoch + 50_000); assert.equal(w.tasks[0].deletedAt, null); assert.equal(taskFocusSeconds(w, id, epoch + 60_000), 21); }
  }
});
test("deadline caps sleep drift and repeated finish adds no time", () => {
  let { w, id } = sample(); w.settings.durations.focus = 1;
  w = applyCommand(w, { type: "timer.start", mode: "focus", taskId: id }, epoch);
  const sessionId = activeSession(w).id;
  assert.equal(remainingMs(activeSession(w), epoch + 600_000), 0);
  w = applyCommand(w, { type: "timer.finish", sessionId }, epoch + 600_000);
  const finished = structuredClone(w);
  w = applyCommand(w, { type: "timer.finish", sessionId }, epoch + 800_000);
  assert.deepEqual(w, finished); assert.equal(taskFocusSeconds(w, id, epoch + 900_000), 60);
  assert.equal(w.sessions[0].endedAt, epoch + 60_000);
});
test("starting a second active/paused session is rejected and breaks are excluded", () => {
  let { w, id } = sample(); w = applyCommand(w, { type: "timer.start", mode: "short", taskId: null }, epoch);
  assert.throws(() => applyCommand(w, { type: "timer.start", mode: "focus", taskId: id }, epoch + 1000));
  const sessionId = activeSession(w).id;
  w = applyCommand(w, { type: "timer.pause", sessionId }, epoch + 5000);
  assert.throws(() => applyCommand(w, { type: "timer.start", mode: "long", taskId: null }, epoch + 10_000));
  assert.equal(taskFocusSeconds(w, id, epoch + 50_000), 0);
});
test("unmeasured completed tasks are N/A, not zero accuracy", () => {
  let { w, id } = sample(); w = applyCommand(w, { type: "task.complete", id }, epoch);
  const result = metrics(w, "2026-10-13", "", "", epoch);
  assert.equal(result.completion, 100); assert.equal(result.accuracy, null); assert.equal(result.accuracySamples, 0); assert.equal(result.score, 100);
});
test("prediction accuracy is symmetric for half and double estimates", () => {
  for (const seconds of [900, 3600]) {
    let { w, id } = sample(); w.settings.durations.focus = 120;
    w = applyCommand(w, { type: "timer.start", mode: "focus", taskId: id }, epoch);
    w = applyCommand(w, { type: "task.complete", id }, epoch + seconds * 1000);
    assert.equal(metrics(w, "2026-10-13", "", "", epoch + seconds * 1000).accuracy, 50);
  }
});
test("Korean midnight splits focus intervals while respecting category/search scope", () => {
  let { w, id } = sample(); const beforeMidnight = Date.parse("2026-10-13T23:59:50+09:00");
  w = applyCommand(w, { type: "timer.start", mode: "focus", taskId: id }, beforeMidnight);
  w = applyCommand(w, { type: "timer.end", sessionId: activeSession(w).id }, beforeMidnight + 20_000);
  assert.equal(metrics(w, "2026-10-13", "", "", beforeMidnight + 20_000).focusSeconds, 10);
  assert.equal(metrics(w, "2026-10-14", "", "", beforeMidnight + 20_000).focusSeconds, 10);
  assert.equal(metrics(w, "2026-10-13", w.categories[1].id, "", beforeMidnight + 20_000).focusSeconds, 0);
  assert.equal(metrics(w, "2026-10-13", "", "[", beforeMidnight + 20_000).tasks.length, 0);
  assert.equal(localDate(beforeMidnight), "2026-10-13");
});
test("workspace validators reject foreign refs, duplicate IDs, overlapping segments and dual active sessions", () => {
  let { w, id } = sample();
  const badRef = structuredClone(w); badRef.tasks[0].categoryId = randomUUID(); assert.equal(workspaceSchema.safeParse(badRef).success, false);
  const duplicate = structuredClone(w); duplicate.tasks.push(duplicate.tasks[0]); assert.equal(workspaceSchema.safeParse(duplicate).success, false);
  w = applyCommand(w, { type: "timer.start", mode: "focus", taskId: id }, epoch);
  const dual = structuredClone(w); dual.sessions.push({ ...dual.sessions[0], id: randomUUID() }); assert.equal(workspaceSchema.safeParse(dual).success, false);
  const badTime = structuredClone(w); badTime.sessions[0].remainingMs = 0; assert.equal(workspaceSchema.safeParse(badTime).success, false);
});
test("common policy is fail-closed for suspension, missing phone and expired grants", () => {
  const base = { isAdmin: false, isSuspended: false, hasPhone: true, isFree: false, requiredGradeId: "grade", hasActiveSubscription: false, hasIndividualGrant: false, userGradeSortOrder: 1, requiredGradeSortOrder: 1 };
  assert.equal(evaluateProgramAccess(base).allowed, false);
  assert.equal(evaluateProgramAccess({ ...base, isFree: true }).allowed, true);
  assert.equal(evaluateProgramAccess({ ...base, isFree: true, hasPhone: false }).allowed, false);
  assert.equal(evaluateProgramAccess({ ...base, isAdmin: true, isSuspended: true }).allowed, false);
  assert.equal(evaluateProgramAccess({ ...base, hasIndividualGrant: true, individualGrantExpiresAt: "2000-01-01" }).allowed, false);
  assert.equal(evaluateProgramAccess({ ...base, hasIndividualGrant: true, individualGrantExpiresAt: "2099-01-01" }).allowed, true);
});
