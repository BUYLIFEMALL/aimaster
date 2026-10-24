// U8 업무 워크스페이스 「받은 업무」로 보낼 내용 만들기(서버 키·공용 표 호출 없이 순수 함수만)
import test from "node:test";
import assert from "node:assert/strict";
import { emptyWorkspace, localDate } from "../src/lib/planner/model.ts";
import { applyCommand } from "../src/lib/planner/engine.ts";
import { taskInboxContent, dayInboxContent, inboxInputSchema } from "../src/lib/planner/inbox.ts";
const now = Date.now(), day = localDate(now);
const add = (w, title, priority = "high") => applyCommand(w, { type: "task.add", input: { title, categoryId: w.settings.defaultCategoryId, priority, estimatedMinutes: 30, plannedDate: day } }, now - 3_600_000);

test("task content has Korean body, simple table values and no internal names", () => {
  let w = add(emptyWorkspace(), "보고서\n초안 작성");
  const id = w.tasks[0].id;
  w = applyCommand(w, { type: "timer.start", mode: "focus", taskId: id }, now - 1_800_000);
  w = applyCommand(w, { type: "timer.end", sessionId: w.sessions[0].id }, now - 600_000);
  const c = taskInboxContent(w, id, now);
  assert.equal(c.kind, "task"); assert.equal(c.title, "보고서 초안 작성");
  assert.match(c.bodyMd, /우선순위: 높음/); assert.match(c.bodyMd, /집중한 시간: 20분/); assert.match(c.bodyMd, /AI 할 일 플래너에서 보냄/);
  assert.deepEqual(c.data, { 예정일: day, 우선순위: "높음", 분류: w.categories[0].name, 상태: "진행 중", "예상 시간(분)": 30, "집중 시간(분)": 20 });
  assert.doesNotMatch(c.bodyMd, /todo|doing|high|null|categoryId/);
});

test("deleted or unknown task cannot be sent", () => {
  let w = add(emptyWorkspace(), "지울 일");
  w = applyCommand(w, { type: "task.trash", id: w.tasks[0].id }, now);
  assert.throws(() => taskInboxContent(w, w.tasks[0].id, now), /찾지 못했습니다/);
  assert.throws(() => taskInboxContent(w, crypto.randomUUID(), now), /찾지 못했습니다/);
});

test("day report lists done/left tasks, metrics and only the saved note", () => {
  let w = add(add(emptyWorkspace(), "완료한 일"), "남은 일", "low");
  w = applyCommand(w, { type: "task.complete", id: w.tasks[0].id }, now);
  w = applyCommand(w, { type: "note.save", date: day, note: "잘한 점: 일찍 시작" }, now);
  const c = dayInboxContent(w, { date: day, categoryId: "", query: "" }, now);
  assert.equal(c.kind, "document"); assert.equal(c.title, `${day} 할 일·성과 보고`);
  assert.match(c.bodyMd, /완료율: 50% \(1 \/ 2개\)/);
  assert.match(c.bodyMd, /- \[x\] 완료한 일/); assert.match(c.bodyMd, /- \[ \] 남은 일 \(.+ · 우선순위 낮음\)/);
  assert.match(c.bodyMd, /## 성과 노트\n잘한 점: 일찍 시작/);
  assert.equal(c.data["완료 수"], 1); assert.equal(c.data["계획 수"], 2); assert.equal(c.data["완료율(%)"], 50);
});

test("empty day is refused and input schema is strict", () => {
  assert.throws(() => dayInboxContent(emptyWorkspace(), { date: day, categoryId: "", query: "" }, now), /보낼 할 일이나 성과 노트가 없습니다/);
  assert.equal(inboxInputSchema.safeParse({ type: "task", taskId: "x" }).success, false);
  assert.equal(inboxInputSchema.safeParse({ type: "day", date: day, categoryId: "", query: "", userId: "다른 회원" }).success, false);
  assert.equal(inboxInputSchema.safeParse({ type: "day", date: day, categoryId: "", query: "" }).success, true);
});

// U8-B 워크스페이스에서 받은 할 일 → 할 일 입력
import { receivedTaskInput, receivedActionSchema } from "../src/lib/planner/received.ts";
test("received row becomes a task input with safe date, priority and default category", () => {
  const w = emptyWorkspace();
  const row = (data) => ({ id: crypto.randomUUID(), source_slug: "ai-work-workspace", title: "  기획서\n마무리 ", data, created_at: new Date(now).toISOString() });
  assert.deepEqual(receivedTaskInput(row({ 예정일: "2026-10-30", 우선순위: "높음" }), w, day), { title: "기획서 마무리", categoryId: w.settings.defaultCategoryId, priority: "high", estimatedMinutes: 0, plannedDate: "2026-10-30" });
  const loose = receivedTaskInput(row({ 예정일: "2026-02-31", 우선순위: "급함" }), w, day);
  assert.equal(loose.plannedDate, day); assert.equal(loose.priority, "normal");
  assert.equal(receivedTaskInput(row(null), w, day).priority, "normal");
  assert.equal(receivedActionSchema.safeParse({ action: "add", id: crypto.randomUUID(), date: day, revision: 3 }).success, true);
  assert.equal(receivedActionSchema.safeParse({ action: "add", id: crypto.randomUUID(), date: day, revision: 3, userId: "다른 회원" }).success, false);
});
