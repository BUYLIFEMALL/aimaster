// U8-B 업무 워크스페이스 → 할 일 플래너(플랜 ai-work-workspace/docs/PLAN_20261025_U8B_TO_PLANNER.md):
// 공용 받은편지함(work_inbox, 받는 곳 ai-task-planner) 한 줄을 할 일 입력으로 바꾸는 순수 함수.
import { z } from "zod";
import { dateSchema, taskInputSchema, type Workspace } from "./model";

export const RECEIVED_TARGET = "ai-task-planner";
export interface ReceivedRow {
  id: string;
  source_slug: string;
  title: string;
  data: Record<string, unknown> | null;
  created_at: string;
}
export const receivedActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), id: z.string().uuid(), date: dateSchema, revision: z.number().int().min(0) }).strict(),
  z.object({ action: z.literal("discard"), id: z.string().uuid() }).strict()
]);
const PRIORITY: Record<string, "high" | "normal" | "low"> = { 높음: "high", 보통: "normal", 낮음: "low" };

/** 받은 줄 → 할 일 입력. 예정일은 받은 날짜가 올바르면 그 날짜, 아니면 화면에서 고른 날짜. 분류는 기본 분류. */
export function receivedTaskInput(row: ReceivedRow, w: Workspace, fallbackDate: string) {
  const data = row.data ?? {};
  const date = typeof data["예정일"] === "string" && dateSchema.safeParse(data["예정일"]).success ? data["예정일"] : fallbackDate;
  const priority = typeof data["우선순위"] === "string" ? PRIORITY[data["우선순위"]] ?? "normal" : "normal";
  return taskInputSchema.parse({
    title: row.title.replace(/\s+/g, " ").trim().slice(0, 200) || "받은 할 일",
    categoryId: w.settings.defaultCategoryId,
    priority,
    estimatedMinutes: 0,
    plannedDate: date
  });
}
