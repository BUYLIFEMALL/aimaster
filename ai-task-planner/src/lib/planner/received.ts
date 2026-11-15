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
  z.object({ action: z.literal("add"), id: z.string().uuid(), date: dateSchema, revision: z.number().int().min(0), categoryId: z.string().max(100).optional() }).strict(),
  // 2026-11-15 한꺼번에 추가: 받은 줄 여러 개를 한 번에(기록 저장 1번)
  z.object({ action: z.literal("addAll"), ids: z.array(z.string().uuid()).min(1).max(50), date: dateSchema, revision: z.number().int().min(0), categoryId: z.string().max(100).optional() }).strict(),
  z.object({ action: z.literal("discard"), id: z.string().uuid() }).strict()
]);
const PRIORITY: Record<string, "high" | "normal" | "low"> = { 높음: "high", 보통: "normal", 낮음: "low" };

/** 화면에서 고른 분류가 보관되지 않은 분류면 그것, 아니면 기본 분류. */
export function receivedCategoryId(w: Workspace, categoryId?: string) {
  return categoryId && w.categories.some(c => c.id === categoryId && !c.archived) ? categoryId : w.settings.defaultCategoryId;
}

/** 받은 줄 → 할 일 입력. 예정일은 받은 날짜가 올바르면 그 날짜, 아니면 화면에서 고른 날짜. 분류는 화면에서 고른 분류(없으면 기본 분류). */
export function receivedTaskInput(row: ReceivedRow, w: Workspace, fallbackDate: string, categoryId?: string) {
  const data = row.data ?? {};
  const date = typeof data["예정일"] === "string" && dateSchema.safeParse(data["예정일"]).success ? data["예정일"] : fallbackDate;
  const priority = typeof data["우선순위"] === "string" ? PRIORITY[data["우선순위"]] ?? "normal" : "normal";
  return taskInputSchema.parse({
    title: row.title.replace(/\s+/g, " ").trim().slice(0, 200) || "받은 할 일",
    categoryId: receivedCategoryId(w, categoryId),
    priority,
    estimatedMinutes: 0,
    plannedDate: date
  });
}
